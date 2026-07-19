-- Gestao de Multas e Infracoes

CREATE TABLE IF NOT EXISTS fines (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  vehicle_id INTEGER REFERENCES vehicles(id),
  plate_raw TEXT,
  plate_normalized TEXT,

  year INTEGER,
  registered_at TEXT NOT NULL DEFAULT (date('now')),
  registered_by TEXT,
  department TEXT,
  fleet_company TEXT,
  notes TEXT,

  fine_type TEXT NOT NULL DEFAULT 'primeira' CHECK (fine_type IN ('primeira', 'segunda')),
  parent_fine_id INTEGER REFERENCES fines(id),
  duplicate_of_fine_id INTEGER REFERENCES fines(id),

  auto_number TEXT,
  renainf_number TEXT,
  renainf_original TEXT,
  points INTEGER,
  infraction_date TEXT,
  infraction_location TEXT,
  infraction_code TEXT,
  infraction_description TEXT,
  issuing_body_code TEXT,
  issuing_body TEXT,

  driver_name TEXT,
  indication_deadline TEXT,
  form_sent_date TEXT,
  form_received_by TEXT,
  protocol_date TEXT,
  identification_method TEXT,

  invoice_status TEXT,
  cigam_launch_number TEXT,
  amount_cents INTEGER,
  discount_cents INTEGER,
  amount_paid_cents INTEGER,
  due_date TEXT,

  discount_launched TEXT,
  discount_launch_date TEXT,
  discount_method TEXT,
  discount_completed TEXT,
  discount_completion_date TEXT,

  status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN (
    'pendente', 'condutor_pendente', 'protocolar_recurso', 'recurso_em_analise',
    'pagto_pendente', 'pagto_data_vencida', 'pagto_realizado', 'concluido', 'cancelado'
  )),

  file_key TEXT,
  file_name TEXT,
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'importacao_pdf', 'importacao_planilha')),

  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fines_vehicle ON fines(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_fines_status ON fines(status);
CREATE INDEX IF NOT EXISTS idx_fines_plate ON fines(plate_normalized);
CREATE INDEX IF NOT EXISTS idx_fines_auto_number ON fines(auto_number);
CREATE INDEX IF NOT EXISTS idx_fines_renainf ON fines(renainf_number);
