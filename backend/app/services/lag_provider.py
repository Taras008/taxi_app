import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta


class BaselineLagProvider:
    
    def __init__(self, csv_path: str):
        p = Path(csv_path)
        if not p.exists():
            raise FileNotFoundError(
                f"Baseline file not found: {csv_path}. "
                "Create it first (make_baseline.py -> demand_baseline.csv)."
            )

        base = pd.read_csv(p)
        required_cols = {"month", "day_of_week", "hour_of_day", "mean_rides"}
        if not required_cols.issubset(set(base.columns)):
            raise ValueError(f"Baseline CSV must contain columns: {required_cols}")

        self.base = base.set_index(["month", "day_of_week", "hour_of_day"])
        self.global_mean = float(base["mean_rides"].mean())

    def mean_for(self, dt: datetime) -> float:
        key = (dt.month, dt.weekday(), dt.hour)
        try:
            return float(self.base.loc[key, "mean_rides"])
        except Exception:
            return self.global_mean

    def get_lags(self, target_dt: datetime) -> dict:
        
        dt_lag1 = target_dt - timedelta(hours=1)
        dt_lag24 = target_dt - timedelta(hours=24)

        lag_1 = self.mean_for(dt_lag1)
        lag_24 = self.mean_for(dt_lag24)

        vals = [self.mean_for(target_dt - timedelta(hours=i)) for i in range(1, 25)]
        roll_24_mean = float(sum(vals) / len(vals))

        return {"lag_1": lag_1, "lag_24": lag_24, "roll_24_mean": roll_24_mean}
