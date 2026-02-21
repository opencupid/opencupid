# Architecture

## External API dependencies

### Location / geocoding — Komoot Photon

Location data entry uses the [Komoot Photon API](https://photon.komoot.io/) for geocoding. The frontend sends a search query and receives structured location results (city name, country, coordinates). Selected locations are stored as scalar fields on `Profile` and `Post`: `cityName`, `country`, `lat`, `lon`. There is no internal city/location table — all geocoding is delegated to Photon.

## Dating interactions

| Action     | User intent              | Visibility consequence     | Reversible?           | Mutual effect? | UX semantics        |
| ---------- | ------------------------ | -------------------------- | --------------------- | -------------- | ------------------- |
| 👍 Like    | Show interest            | Visible to both (on match) | Yes                   | Yes (match)    | Flirty / open       |
| ❌ Dislike | Not interested _for now_ | Hidden from _liker only_   | Yes                   | No             | “Pass” / Swipe left |
| 🚫 Block   | Avoid / protect / reject | Hidden from _both sides_   | Yes (admin override?) | Yes            | Hard boundary       |
