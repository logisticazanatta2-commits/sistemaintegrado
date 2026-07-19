-- Importacao inicial do modulo Hodometro Mensal, a partir do arquivo
-- 'Hodometro Atualizado dos Veiculos - SIGF' (44 registros, 19/07/2026).
-- Somente veiculos de categoria 'veiculo' (frota) sao considerados.

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (55, 219697, 216817, 2880, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 219697, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 55;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (43, 286654, 283460, 3194, '2026-07-18', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 286654, odometer_reference_date = '2026-07-18', updated_at = datetime('now') WHERE id = 43;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (18, 307913, 307913, 0, '2026-05-01', '2026-05', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 307913, odometer_reference_date = '2026-05-01', updated_at = datetime('now') WHERE id = 18;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (54, 246773, 246159, 614, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 246773, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 54;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (11, 115784, 110090, 5694, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 115784, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 11;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (41, 162160, 154643, 7517, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 162160, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 41;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (24, 174287, 171700, 2587, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 174287, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 24;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (25, 177255, 174544, 2711, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 177255, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 25;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (40, 184707, 179554, 5153, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 184707, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 40;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (17, 145357, 137358, 7999, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 145357, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 17;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (39, 474819, 471951, 2868, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 474819, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 39;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (42, 700017, 697382, 2635, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 700017, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 42;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (10, 120546, 115786, 4760, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 120546, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 10;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (6, 261932, 258544, 3388, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 261932, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 6;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (13, 96935, 93769, 3166, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 96935, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 13;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (37, 276513, 272943, 3570, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 276513, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 37;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (14, 225409, 220414, 4995, '2026-07-18', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 225409, odometer_reference_date = '2026-07-18', updated_at = datetime('now') WHERE id = 14;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (3, 304200, 299384, 4816, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 304200, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 3;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (2, 293616, 290116, 3500, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 293616, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 2;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (1, 249810, 249810, 0, '2026-05-01', '2026-05', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 249810, odometer_reference_date = '2026-05-01', updated_at = datetime('now') WHERE id = 1;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (38, 259970, 255377, 4593, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 259970, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 38;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (19, 214532, 205081, 9451, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 214532, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 19;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (58, 152085, 150372, 1713, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 152085, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 58;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (30, 82141, 80239, 1902, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 82141, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 30;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (15, 610082, 604718, 5364, '2026-07-18', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 610082, odometer_reference_date = '2026-07-18', updated_at = datetime('now') WHERE id = 15;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (5, 344532, 340522, 4010, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 344532, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 5;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (8, 191077, 191077, 0, '2026-05-01', '2026-05', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 191077, odometer_reference_date = '2026-05-01', updated_at = datetime('now') WHERE id = 8;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (4, 393612, 390978, 2634, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 393612, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 4;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (12, 303196, 298332, 4864, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 303196, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 12;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (7, 243198, 237100, 6098, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 243198, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 7;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (31, 97187, 91467, 5720, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 97187, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 31;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (32, 202459, 194735, 7724, '2026-07-18', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 202459, odometer_reference_date = '2026-07-18', updated_at = datetime('now') WHERE id = 32;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (33, 246481, 239039, 7442, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 246481, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 33;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (34, 222940, 216655, 6285, '2026-07-18', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 222940, odometer_reference_date = '2026-07-18', updated_at = datetime('now') WHERE id = 34;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (35, 182980, 176667, 6313, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 182980, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 35;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (36, 213009, 207124, 5885, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 213009, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 36;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (60, 101104, 93790, 7314, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 101104, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 60;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (61, 93961, 89050, 4911, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 93961, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 61;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (59, 107299, 100301, 6998, '2026-07-16', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 107299, odometer_reference_date = '2026-07-16', updated_at = datetime('now') WHERE id = 59;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (27, 67921, 67921, 0, '2026-05-01', '2026-05', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 67921, odometer_reference_date = '2026-05-01', updated_at = datetime('now') WHERE id = 27;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (29, 79380, 79380, 0, '2026-05-01', '2026-05', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 79380, odometer_reference_date = '2026-05-01', updated_at = datetime('now') WHERE id = 29;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (57, 105833, 95122, 10711, '2026-07-18', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 105833, odometer_reference_date = '2026-07-18', updated_at = datetime('now') WHERE id = 57;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (28, 84939, 84939, 0, '2026-05-01', '2026-05', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 84939, odometer_reference_date = '2026-05-01', updated_at = datetime('now') WHERE id = 28;

INSERT INTO odometer_readings (vehicle_id, odometer, previous_odometer, delta_km, reading_date, reference_month, source, recorded_by, notes, status, override) VALUES (56, 91037, 81455, 9582, '2026-07-18', '2026-07', 'importacao', 'Importacao inicial SIGF', NULL, 'valido', 0);
UPDATE vehicles SET odometer = 91037, odometer_reference_date = '2026-07-18', updated_at = datetime('now') WHERE id = 56;

