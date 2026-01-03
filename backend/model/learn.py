FEATURES = [
    "temp", "rhum", "prcp", "wspd", "pres",
    "hour_of_day", "day_of_week", "month",
    "hour_sin", "hour_cos",
    "lag_1", "lag_24", "roll_24_mean"
]

TARGET = "rides_count"

import pandas as pd

# === LOAD ===
df = pd.read_csv("hourly_demand_features.csv")

# === FIX TIME ===
df["hour"] = pd.to_datetime(df["hour"])
df = df.sort_values("hour")
df = df.set_index("hour")

# === FEATURES & TARGET ===
FEATURES = [
    "temp", "rhum", "prcp", "wspd", "pres",
    "hour_of_day", "day_of_week", "month",
    "hour_sin", "hour_cos",
    "lag_1", "lag_24", "roll_24_mean"
]

TARGET = "rides_count"

# === DROP NaNs (lag-related) ===
df_model = df.dropna(subset=FEATURES + [TARGET])

X = df_model[FEATURES]
y = df_model[TARGET]

print("X shape:", X.shape)
print("y shape:", y.shape)

print("\nNaNs in X:")
print(X.isna().sum())

print("\nTarget stats:")
print(y.describe())
