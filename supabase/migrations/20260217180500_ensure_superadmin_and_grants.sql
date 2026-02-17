-- Asegurar que el usuario principal sea Super Admin en la base de datos
UPDATE public.members 
SET is_super_admin = true 
WHERE email = 'cl.jmunoz@gmail.com';

-- Asegurar que los roles administrativos tengan GRANT en las tablas críticas
GRANT ALL ON public.divisions TO authenticated;
GRANT ALL ON public.tournament_types TO authenticated;
GRANT ALL ON public.member_divisions TO authenticated;
GRANT ALL ON public.division_change_notifications TO authenticated;
