-- Cadastro base de veiculos, equipamentos e particulares

CREATE TABLE IF NOT EXISTS vehicles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL CHECK (category IN ('veiculo', 'equipamento', 'particular')),
  plate TEXT,
  registered_plate TEXT,
  model TEXT NOT NULL,
  vehicle_type TEXT,
  nickname TEXT,
  responsible TEXT,
  cost_center TEXT,
  status TEXT NOT NULL DEFAULT 'disponivel'
    CHECK (status IN ('disponivel', 'em_uso', 'em_manutencao', 'bloqueado', 'inativo')),
  asset_code TEXT,
  renavam TEXT,
  chassis TEXT,
  manufacture_year INTEGER,
  model_year INTEGER,
  owner_name TEXT,
  odometer INTEGER NOT NULL DEFAULT 0,
  odometer_reference_date TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate
  ON vehicles(plate)
  WHERE plate IS NOT NULL AND plate != '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_asset_code
  ON vehicles(asset_code)
  WHERE asset_code IS NOT NULL AND asset_code != '';

CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
