-- Datos autorizados por el titular para mostrarse a los compradores.
-- Conserva una configuración existente; los cambios se realizan desde Administración.
insert into public.site_settings(key,value) values (
 'bank_transfer',
 '{"bank":"Banco de Guayaquil","account_type":"Ahorros","account_number":"28786985","identification":"1718276437","holder":"Michael Vivas Huertas"}'
) on conflict(key) do nothing;
