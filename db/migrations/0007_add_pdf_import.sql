-- Importacao automatica de orcamentos/OS em PDF (modulo de Manutencao).

ALTER TABLE work_orders ADD COLUMN supplier_document TEXT;
ALTER TABLE work_orders ADD COLUMN financial_status TEXT;
ALTER TABLE work_orders ADD COLUMN products_total_cents INTEGER;
ALTER TABLE work_orders ADD COLUMN services_total_cents INTEGER;
ALTER TABLE work_orders ADD COLUMN discount_cents INTEGER;
ALTER TABLE work_orders ADD COLUMN surcharge_cents INTEGER;
ALTER TABLE work_orders ADD COLUMN source TEXT NOT NULL DEFAULT 'manual';

ALTER TABLE work_order_items ADD COLUMN item_type TEXT NOT NULL DEFAULT 'servico';
ALTER TABLE work_order_items ADD COLUMN category TEXT;

CREATE TABLE IF NOT EXISTS maintenance_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER REFERENCES vehicles(id),
  work_order_id INTEGER REFERENCES work_orders(id),

  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_hash TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'enviado' CHECK (status IN (
    'enviado', 'processando', 'extraido', 'revisao_necessaria', 'rascunho',
    'confirmado', 'erro', 'cancelado', 'duplicado'
  )),
  error_message TEXT,

  doc_type TEXT,
  doc_number TEXT,
  os_number TEXT,
  invoice_number TEXT,
  issue_date TEXT,
  service_date TEXT,

  supplier_name TEXT,
  supplier_document TEXT,
  responsible_name TEXT,

  plate_raw TEXT,
  plate_normalized TEXT,
  odometer_extracted INTEGER,

  observations TEXT,
  extracted_json TEXT NOT NULL DEFAULT '{}',

  products_total_cents INTEGER,
  services_total_cents INTEGER,
  discount_cents INTEGER,
  surcharge_cents INTEGER,
  total_cents INTEGER,
  total_calculated_cents INTEGER,

  financial_status TEXT NOT NULL DEFAULT 'orcamento_recebido',

  duplicate_of_import_id INTEGER REFERENCES maintenance_imports(id),
  duplicate_override_by TEXT,
  duplicate_override_reason TEXT,

  created_by TEXT NOT NULL,
  confirmed_by TEXT,
  confirmed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_maintenance_imports_vehicle ON maintenance_imports(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_imports_status ON maintenance_imports(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_imports_hash ON maintenance_imports(file_hash);

ALTER TABLE work_orders ADD COLUMN import_id INTEGER REFERENCES maintenance_imports(id);
