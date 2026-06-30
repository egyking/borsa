"""Global news sentiment via the GDELT Project (free, no API key, no signup).

GDELT indexes worldwide news (broadcast, print, web) in ~100 languages and
scores the "tone" of coverage per article. We query the DOC 2.0 API in
ToneChart mode, which returns a histogram of article counts per tone bin
(-10 very negative .. +10 very positive); the count-weighted average of that
histogram is our sentiment score, normalised to roughly -1..+1.

Two layers, mirroring how news actually moves these assets:
  - Macro sentiment: "gold / Fed / inflation" and "Egypt economy / EGX" --
    computed once per run, reused across all stocks (and gold).
  - Company sentiment: per-stock query using its English search name: used
    when there's enough coverage (>=MIN_ARTICLES), otherwise we fall back
    to the Egypt macro score so thin coverage doesn't inject noise.

GDELT asks for >=5s between requests; we self-throttle. Network/parse errors
degrade to a neutral (score=0) result -- a missing news signal must never
break the price/technical recommendation pipeline.
"""
import os
import json
import time
import urllib.parse
import urllib.request
import urllib.error

from config import CACHE_DIR

GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc"
MIN_GAP_SECONDS = 10.0    # GDELT asks for >=5s between requests; extra margin for jitter
RETRY_BACKOFF_SECONDS = 12.0
MIN_ARTICLES = 5          # below this, company-specific tone is too noisy to trust
CACHE_MAX_AGE_HOURS = 8

_last_call_ts = 0.0


def _throttle():
    global _last_call_ts
    wait = MIN_GAP_SECONDS - (time.time() - _last_call_ts)
    if wait > 0:
        time.sleep(wait)
    _last_call_ts = time.time()


def _cache_path(query: str, timespan: str) -> str:
    key = "".join(c if c.isalnum() else "_" for c in f"{query}_{timespan}")[:120]
    os.makedirs(CACHE_DIR, exist_ok=True)
    return os.path.join(CACHE_DIR, f"news_{key}.json")


def _cached(query: str, timespan: str):
    path = _cache_path(query, timespan)
    if os.path.exists(path):
        age_h = (time.time() - os.path.getmtime(path)) / 3600
        if age_h < CACHE_MAX_AGE_HOURS:
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception:
                pass
    return None


def _store_cache(query: str, timespan: str, data: dict):
    try:
        with open(_cache_path(query, timespan), "w", encoding="utf-8") as f:
            json.dump(data, f)
    except Exception:
        pass


def fetch_tone(query: str, timespan: str = "3d") -> dict:
    """Count-weighted average GDELT tone for `query`.

    Returns {"score": -1..1, "n_articles": int, "raw_tone": float}.
    Neutral/zero-confidence result on any failure or insufficient coverage.
    """
    cached = _cached(query, timespan)
    if cached is not None:
        return cached

    neutral = {"score": 0.0, "n_articles": 0, "raw_tone": 0.0}
    params = {
        "query": query,
        "mode": "ToneChart",
        "format": "json",
        "timespan": timespan,
    }
    url = f"{GDELT_ENDPOINT}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": "borsa-app/1.0"})

    for attempt in (1, 2):
        try:
            _throttle()
            with urllib.request.urlopen(req, timeout=15) as resp:
                raw = resp.read().decode("utf-8", errors="ignore")
            if not raw or "limit requests" in raw.lower():
                raise ValueError("rate limited or empty body")
            data = json.loads(raw)
            bins = data.get("tonechart", [])
            total = sum(b.get("count", 0) for b in bins)
            if total == 0:
                _store_cache(query, timespan, neutral)
                return neutral
            weighted = sum(b.get("bin", 0) * b.get("count", 0) for b in bins) / total
            result = {
                "score": round(max(-1.0, min(1.0, weighted / 10.0)), 3),
                "n_articles": total,
                "raw_tone": round(weighted, 2),
            }
            _store_cache(query, timespan, result)
            return result
        except (urllib.error.HTTPError, ValueError) as e:
            if attempt == 1:
                time.sleep(RETRY_BACKOFF_SECONDS)
                continue
            print(f"    news fetch failed ({query!r}): {e}")
            return neutral
        except Exception as e:
            print(f"    news fetch failed ({query!r}): {e}")
            return neutral
    return neutral


def sentiment_label(score: float) -> str:
    if score >= 0.15:
        return "إيجابية"
    if score <= -0.15:
        return "سلبية"
    return "محايدة"


def get_macro_sentiment() -> dict:
    """Two macro sentiment streams: Egypt economy, and gold/rates/geopolitics."""
    egypt = fetch_tone("Egypt economy OR Egyptian pound OR EGX stock exchange", timespan="3d")
    gold = fetch_tone("gold price OR federal reserve interest rate OR gold safe haven", timespan="3d")
    egypt["label"] = sentiment_label(egypt["score"])
    gold["label"] = sentiment_label(gold["score"])
    return {"egypt": egypt, "gold": gold}


def get_company_sentiment(search_name: str, macro_egypt: dict) -> dict:
    """Company-specific sentiment, falling back to Egypt macro if too thin."""
    company = fetch_tone(f'"{search_name}"', timespan="5d")
    if company["n_articles"] >= MIN_ARTICLES:
        return {**company, "source": "company"}
    return {**macro_egypt, "source": "macro"}


def apply_news_adjustment(rec: dict, sentiment: dict, weight: float = 1.0,
                          max_shift: float = 0.08) -> dict:
    """Nudge an existing ML/rule-based recommendation toward the news sentiment.

    Bounded, transparent adjustment: shifts buy/sell probability by at most
    `max_shift` (scaled by `weight` and how much news coverage exists), then
    re-derives signal/confidence/score from the adjusted probabilities. The
    underlying technical recommendation remains the dominant driver.
    """
    score = sentiment.get("score", 0.0) * weight
    out = dict(rec)
    out["news"] = {
        "score": round(score, 3),
        "label": sentiment_label(score),
        "source": sentiment.get("source", "macro"),
        "n_articles": sentiment.get("n_articles", 0),
    }
    if abs(score) < 0.05:
        return out  # negligible news signal, leave recommendation untouched

    shift = score * max_shift
    pb = max(0.0, min(1.0, rec.get("prob_buy", 0.0) + shift))
    ps = max(0.0, min(1.0, rec.get("prob_sell", 0.0) - shift))
    ph = max(0.0, 1.0 - pb - ps)
    total = pb + ph + ps
    if total > 0:
        pb, ph, ps = pb / total, ph / total, ps / total

    probs = {"buy": pb, "hold": ph, "sell": ps}
    signal = max(probs, key=probs.get)
    out.update({
        "signal": signal,
        "confidence": round(probs[signal], 3),
        "score": round(pb - ps, 3),
        "prob_buy": round(pb, 3),
        "prob_hold": round(ph, 3),
        "prob_sell": round(ps, 3),
    })
    if abs(score) >= 0.15:
        reasons = list(rec.get("reasons", []))
        verb = "يدعم الشراء" if score > 0 else "يزيد الحذر من الشراء"
        reasons.append(f"المعنويات الإخبارية {sentiment_label(score)} حالياً ({verb})")
        out["reasons"] = reasons[:6]
    return out
