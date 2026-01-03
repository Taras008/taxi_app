import json
from pathlib import Path
from typing import List, Optional

import joblib

class ModelStore:
    def __init__(self, model_path: str, schema_path: str):
        self.model_path = model_path
        self.schema_path = schema_path
        self.model = None
        self.features: List[str] = []
        self._load_schema()
        self._try_load_model()

    def _load_schema(self):
        data = json.loads(Path(self.schema_path).read_text(encoding="utf-8"))
        self.features = data["features"]

    def _try_load_model(self):
        p = Path(self.model_path)
        if p.exists():
            self.model = joblib.load(p)
        else:
            self.model = None

    def predict_one(self, X_row: dict) -> float:
        """
        Predict for single row. If model missing -> stub.
        """
        if self.model is None:
            # Stub response (for frontend integration)
            # Make it deterministic-ish:
            return float(50.0)

        import pandas as pd
        X = pd.DataFrame([X_row])[self.features]
        return float(self.model.predict(X)[0])
