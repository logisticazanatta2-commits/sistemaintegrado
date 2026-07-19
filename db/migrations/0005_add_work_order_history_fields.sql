-- Campos adicionais para preservar dados do historico real de manutencao
-- (planilha de controle), uteis tambem para OS futuras criadas no sistema.

ALTER TABLE work_orders ADD COLUMN maintenance_type TEXT;
ALTER TABLE work_orders ADD COLUMN os_number TEXT;
ALTER TABLE work_orders ADD COLUMN invoice_number TEXT;
ALTER TABLE work_orders ADD COLUMN payment_term TEXT;
ALTER TABLE work_orders ADD COLUMN project_client TEXT;
ALTER TABLE work_orders ADD COLUMN odometer_at_service INTEGER;
