-- Veiculos que ja saíram da frota ativa (vendidos/baixados) mas tem
-- historico de manutencao real na planilha Frota_ZANATTA_VDH_v04_2026_2.xlsx,
-- aba "Veiculos_DESCONTINUADOS". Cadastrados como status=inativo para nao
-- perder o historico.

INSERT INTO vehicles (
  category, plate, registered_plate, model, vehicle_type, nickname,
  responsible, cost_center, status, asset_code, renavam, chassis,
  manufacture_year, model_year, owner_name, odometer, odometer_reference_date,
  uf_base, fleet_class, notes
) VALUES
  ('veiculo', 'GBF9779', 'GBF9779', 'CHEVROLET/ MONTANA LS', 'Automóvel', NULL,
   NULL, 'MONTAGEM', 'inativo', '9779', '01089141774', '9BGCA8030GB170872',
   2016, 2016, NULL, 0, NULL,
   'MONTES CLAROS/MG', 'VEICULO LEVE',
   'Baixada/sucata (Volpato, cancelado 14/08/2025). Importado de Frota_ZANATTA_VDH_v04_2026_2.xlsx para preservar historico de manutencao.'),
  ('veiculo', 'FXD0929', 'FXD0929', 'CHEVROLET/ ONIX 10 MT JOY E', 'Automóvel', NULL,
   NULL, 'MONTAGEM', 'inativo', '0929', '01151296160', '9BGKL4800JB242756',
   2018, 2018, NULL, 0, NULL,
   NULL, 'VEICULO LEVE',
   'Venda/seguradora (Volpato, retirado). Importado de Frota_ZANATTA_VDH_v04_2026_2.xlsx para preservar historico de manutencao.'),
  ('veiculo', 'FUD1H92', 'FUD1H92', 'VAN SPRINTER DIESEL 314 MARTICAR M', 'Utilitário', NULL,
   'BIGVANS VEICULOS', 'FABRICA', 'inativo', 'H92', '01284338328', '08AC907635NE205809',
   2021, 2022, NULL, 0, NULL,
   'ARTUR NOGUEIRA/SP', 'UTILITARIO',
   'Vendido (Volpato, retirado 07/06/2023). Importado de Frota_ZANATTA_VDH_v04_2026_2.xlsx para preservar historico de manutencao.'),
  ('veiculo', 'LTL8A02', 'LTL8A02', 'I/VW AMAROK V6 HIGH AC4', 'Utilitário', NULL,
   'ADM/COML', 'ZANATTA SP', 'inativo', '8A02', '01156867840', 'WV1DA22H7JA039666',
   2018, 2018, NULL, 0, NULL,
   'JAGUARIUNA/SP', 'UTILITARIO',
   'Vendido. Importado de Frota_ZANATTA_VDH_v04_2026_2.xlsx para preservar historico de manutencao.');
