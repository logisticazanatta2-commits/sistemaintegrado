-- Campos adicionais vindos da base real de frota (UF/base operacional e
-- classificacao detalhada de frota, ex: VEICULO LEVE, PTA, BOBCAT)

ALTER TABLE vehicles ADD COLUMN uf_base TEXT;
ALTER TABLE vehicles ADD COLUMN fleet_class TEXT;
