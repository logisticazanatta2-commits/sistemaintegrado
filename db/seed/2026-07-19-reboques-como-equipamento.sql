-- Reclassifica reboques e a "Julieta" (guincho) de "veiculo" para
-- "equipamento" -- sao rebocados/tracionados, nao veiculos motorizados
-- da frota propriamente ditos.
UPDATE vehicles SET category = 'equipamento'
WHERE plate IN (
  'IQW6A37', 'HYU7H06', 'FOI2E57', 'FFR9116', 'FXY9496',
  'DDN7458', 'DDN7547', 'DDN7691', 'DDN7862', 'DDN7903',
  'ERT1821', 'ERT2042', 'ERT2132', 'GFL4757', 'GJP9683',
  'HYU7746', 'HYU7726'
);
