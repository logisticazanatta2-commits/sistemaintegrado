-- Historico mensal de hodometro (fonte oficial de quilometragem).
-- vehicles.odometer / vehicles.odometer_reference_date continuam sendo
-- o valor "atual" oficial; esta tabela guarda cada leitura, sem nunca
-- apagar ou substituir registros anteriores.

CREATE TABLE IF NOT EXISTS odometer_readings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  odometer INTEGER NOT NULL,
  previous_odometer INTEGER,
  delta_km INTEGER,
  reading_date TEXT NOT NULL,
  reference_month TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'manual',
  recorded_by TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'valido',
  override INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_odometer_readings_vehicle ON odometer_readings(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_odometer_readings_month ON odometer_readings(reference_month);
