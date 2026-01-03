import pandas as pd
from pathlib import Path

DATA_PATH = "hourly_demand_features.csv"
OUT_PATH = Path("../artifacts/demand_baseline.csv")

OUT_PATH.parent.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(DATA_PATH)
df["hour"] = pd.to_datetime(df["hour"], utc=True).dt.tz_convert(None)

baseline = (
    df.groupby(["month", "day_of_week", "hour_of_day"])["rides_count"]
      .mean()
      .rename("mean_rides")
      .reset_index()
)

baseline.to_csv(OUT_PATH, index=False)
print("Saved", OUT_PATH, "shape=", baseline.shape)
