-- Fluxo interno de tratamento das multas (departamento/responsavel, RH, financeiro)
-- Campos operacionais, separados dos dados oficiais da autuacao.

ALTER TABLE fines ADD COLUMN flow_responsible_name TEXT;
ALTER TABLE fines ADD COLUMN flow_responsible_email TEXT;
ALTER TABLE fines ADD COLUMN flow_responsible_status TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE fines ADD COLUMN flow_department_status TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE fines ADD COLUMN flow_rh_status TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE fines ADD COLUMN flow_financial_status TEXT NOT NULL DEFAULT 'nao_iniciado';
ALTER TABLE fines ADD COLUMN discount_installments INTEGER;
