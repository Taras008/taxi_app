
Запуск
cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

Тренувати модельку
cd backend/model
python train_rf.py