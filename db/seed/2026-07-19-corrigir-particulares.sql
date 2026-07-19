-- Corrige a categoria de 2 veiculos particulares que haviam sido
-- importados incorretamente como "veiculo"/"equipamento" da frota.
UPDATE vehicles SET category = 'particular' WHERE plate = 'EJC6F29';
UPDATE vehicles SET category = 'particular', responsible = 'VOLNEI' WHERE plate = 'STM3G17';
