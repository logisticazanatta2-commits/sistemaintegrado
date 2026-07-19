-- KYC1G84 (M.BENZ/710 PLATAFORMA) e um caminhao-plataforma, no mesmo
-- padrao dos demais equipamentos com plataforma ja reclassificados.
-- Ajusta a frota oficial de "veiculo" para 45, batendo com o arquivo
-- de hodometro (44 leituras + 1 ausente: PWU3C44).
UPDATE vehicles SET category = 'equipamento' WHERE plate = 'KYC1G84';
