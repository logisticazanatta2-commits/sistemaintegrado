-- Exclui definitivamente os 4 veiculos descontinuados marcados como
-- "inativo" (GBF9779, FXD0929, FUD1H92, LTL8A02) e todo o historico de
-- manutencao vinculado a eles (work_order_items -> work_orders -> vehicles).
DELETE FROM work_order_items
WHERE work_order_id IN (
  SELECT id FROM work_orders
  WHERE vehicle_id IN (
    SELECT id FROM vehicles WHERE plate IN ('GBF9779', 'FXD0929', 'FUD1H92', 'LTL8A02')
  )
);

DELETE FROM work_orders
WHERE vehicle_id IN (
  SELECT id FROM vehicles WHERE plate IN ('GBF9779', 'FXD0929', 'FUD1H92', 'LTL8A02')
);

DELETE FROM vehicles WHERE plate IN ('GBF9779', 'FXD0929', 'FUD1H92', 'LTL8A02');
