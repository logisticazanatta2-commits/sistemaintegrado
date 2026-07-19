-- Ordens de servico (manutencao) e itens de custo

CREATE TABLE IF NOT EXISTS work_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id),
  status TEXT NOT NULL DEFAULT 'solicitada' CHECK (status IN (
    'solicitada', 'em_analise', 'aguardando_orcamento', 'aguardando_aprovacao',
    'aprovada', 'em_execucao', 'concluida', 'faturada', 'encerrada', 'cancelada'
  )),
  problem_description TEXT NOT NULL,
  workshop TEXT,
  requested_by TEXT,
  approved_by TEXT,
  payment_method TEXT,
  final_cost_cents INTEGER,
  opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  closed_at TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_work_orders_vehicle ON work_orders(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);

CREATE TABLE IF NOT EXISTS work_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  work_order_id INTEGER NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_work_order_items_wo ON work_order_items(work_order_id);
