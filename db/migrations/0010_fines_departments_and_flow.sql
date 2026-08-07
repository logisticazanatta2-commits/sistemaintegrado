-- Reestruturacao do modulo de multas: setores reais, historico de alteracoes,
-- documentos multiplos e permissao de edicao por setor (RH/Financeiro/Gestor).

CREATE TABLE IF NOT EXISTS departments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_departments_name ON departments(name);

INSERT INTO departments (name) VALUES
  ('Administrativo'), ('Comercial'), ('Eletrica'), ('Fabrica'), ('Logistica'),
  ('Montagem'), ('Obras'), ('Diretoria'), ('Recursos Humanos'), ('Terceiros'),
  ('Locadora'), ('Outros')
ON CONFLICT (name) DO NOTHING;

-- Vinculo do veiculo ao setor "dono" (pre-preenche a multa automaticamente)
ALTER TABLE vehicles ADD COLUMN department_id INTEGER REFERENCES departments(id);

-- fines: vinculo formal a departments (mantem a coluna "department" texto
-- por compatibilidade com o historico ja importado da planilha)
ALTER TABLE fines ADD COLUMN department_id INTEGER REFERENCES departments(id);

UPDATE fines SET department_id = (
  SELECT d.id FROM departments d
  WHERE UPPER(d.name) = UPPER(TRIM(fines.department))
     OR (UPPER(TRIM(fines.department)) = 'LOGISTICA' AND d.name = 'Logistica')
     OR (UPPER(TRIM(fines.department)) = 'MONTAGEM' AND d.name = 'Montagem')
     OR (UPPER(TRIM(fines.department)) = 'NONTAGEM' AND d.name = 'Montagem')
     OR (UPPER(TRIM(fines.department)) = 'COMERCIAL' AND d.name = 'Comercial')
     OR (UPPER(TRIM(fines.department)) = 'FABRICA' AND d.name = 'Fabrica')
     OR (UPPER(TRIM(fines.department)) = 'ELETRICA' AND d.name = 'Eletrica')
     OR (UPPER(TRIM(fines.department)) = 'LOCALIZA' AND d.name = 'Locadora')
) WHERE department IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fines_department ON fines(department_id);
CREATE INDEX IF NOT EXISTS idx_fines_due_date ON fines(due_date);

-- Historico/auditoria: quem alterou o que, valor anterior e novo
CREATE TABLE IF NOT EXISTS fine_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fine_id INTEGER NOT NULL REFERENCES fines(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  field_label TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fine_history_fine ON fine_history(fine_id, created_at);

-- Documentos: multiplos anexos por multa (notificacao, boleto, indicacao,
-- comprovante, defesa/recurso...), substitui o anexo unico file_key/file_name
CREATE TABLE IF NOT EXISTS fine_documents (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fine_id INTEGER NOT NULL REFERENCES fines(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'notificacao', 'boleto', 'indicacao_condutor', 'comprovante', 'defesa_recurso', 'outro'
  )),
  file_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  uploaded_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_fine_documents_fine ON fine_documents(fine_id);

INSERT INTO fine_documents (fine_id, doc_type, file_key, file_name, uploaded_by, created_at)
SELECT id, 'notificacao', file_key, file_name, created_by, created_at
FROM fines WHERE file_key IS NOT NULL;

-- Permissao de edicao por setor dentro do modulo de multas, sem criar
-- cadastro de usuario separado: reaproveita app_users. Quando fines_role
-- for NULL, o comportamento antigo se mantem (admin=full, viewer=leitura).
ALTER TABLE app_users ADD COLUMN fines_role TEXT
  CHECK (fines_role IN ('admin_multas', 'gestor_setor', 'financeiro', 'rh'));
ALTER TABLE app_users ADD COLUMN fines_department_id INTEGER REFERENCES departments(id);
