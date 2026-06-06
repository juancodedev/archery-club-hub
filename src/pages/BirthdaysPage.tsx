import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Cake, Calendar as CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn, getAvatarUrl } from "@/lib/utils";

interface BirthdayMember {
    id: string;
    full_name: string;
    date_of_birth: string;
    avatar_url: string | null;
    club_id: string;
}

export default function BirthdaysPage() {
    const { member, isSuperAdminSubdomain } = useAuth();
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedClubId, setSelectedClubId] = useState<string | null>(member?.club_id || null);

    useEffect(() => {
        if (member?.club_id && !selectedClubId) {
            setSelectedClubId(member.club_id);
        }
    }, [member?.club_id, selectedClubId]);

    const isSuperAdmin = member?.is_super_admin || isSuperAdminSubdomain;
    const roles = member?.roles || [];
    const isArcherOnly = roles.includes("arquero") && roles.length === 1 && !isSuperAdmin;

    // Fetch clubs for superadmin
    const { data: clubs } = useQuery({
        queryKey: ["all-clubs"],
        queryFn: async () => {
            const { data, error } = await supabase.from("public_clubs_view").select("id, name");
            if (error) throw error;
            return data;
        },
        enabled: isSuperAdmin,
    });

    // Fetch members with birthdays
    const { data: members } = useQuery<BirthdayMember[]>({
        queryKey: ["club-birthdays", selectedClubId],
        queryFn: async () => {
            if (!selectedClubId) return [];
            const { data, error } = await supabase
                .from("members")
                .select("id, full_name, date_of_birth, avatar_url, club_id")
                .eq("club_id", selectedClubId)
                .not("date_of_birth", "is", null);
            if (error) throw error;
            return data as unknown as BirthdayMember[];
        },
        enabled: !!selectedClubId,
    });

    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    const daysInMonth = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const date = new Date(year, month, 1);
        const days = [];
        while (date.getMonth() === month) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    }, [currentDate]);

    const birthdaysByDay = useMemo(() => {
        if (!members) return {};
        const map: Record<number, BirthdayMember[]> = {};
        members.forEach(m => {
            const dob = new Date(m.date_of_birth);
            const day = dob.getUTCDate();
            const month = dob.getUTCMonth();
            if (month === currentDate.getMonth()) {
                if (!map[day]) map[day] = [];
                map[day].push(m);
            }
        });
        return map;
    }, [members, currentDate]);

    const today = useMemo(() => new Date(), []);
    const isToday = (day: number) => {
        return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
    };

    const nextMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)));
    const prevMonth = () => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)));

    const todaysBirthdays = useMemo(() => {
        if (!members) return [];
        return members.filter(m => {
            const dob = new Date(m.date_of_birth);
            return dob.getUTCDate() === today.getDate() && dob.getUTCMonth() === today.getMonth();
        });
    }, [members, today]);

    if (isArcherOnly) {
        return (
            <div className="space-y-8 pb-10">
                <div className="flex flex-col gap-4">
                    <h1 className="text-3xl font-display font-black text-foreground flex items-center gap-3">
                        <Cake className="h-8 w-8 text-primary" />
                        Cumpleaños de Hoy 🏹
                    </h1>
                    <p className="text-muted-foreground italic">"Un año más de precisión y pasión"</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {todaysBirthdays.length > 0 ? (
                        todaysBirthdays.map((m, i) => (
                            <motion.div
                                key={m.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                className="glass rounded-[2rem] p-6 flex flex-col items-center text-center space-y-4 border-primary/20 bg-primary/5"
                            >
                                <div className="relative">
                                    <Avatar className="h-24 w-24 border-4 border-primary/30">
                                        <AvatarImage src={getAvatarUrl(m.avatar_url)} />
                                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">
                                            {m.full_name?.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="absolute -bottom-2 -right-2 bg-primary text-white p-2 rounded-full shadow-lg">
                                        <Cake className="h-4 w-4" />
                                    </div>
                                </div>
                                <div>
                                    <h3 className="text-xl font-display font-bold text-foreground">{m.full_name}</h3>
                                    <Badge variant="secondary" className="mt-2 text-[10px] font-black uppercase tracking-widest text-primary bg-primary/10 border-primary/20">¡FELIZ CUMPLEAÑOS!</Badge>
                                </div>
                            </motion.div>
                        ))
                    ) : (
                        <div className="sm:col-span-2 lg:col-span-3 glass rounded-[2rem] p-12 text-center border-dashed border-2 border-white/5">
                            <Cake className="h-12 w-12 mx-auto mb-4 text-muted-foreground/20" />
                            <p className="text-sm text-muted-foreground font-medium">No hay cumpleaños registrados para hoy.</p>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl sm:text-4xl font-display font-black text-foreground flex items-center gap-3">
                        <CalendarIcon className="h-8 w-8 text-primary" />
                        Calendario de Cumpleaños
                    </h1>
                    <p className="text-muted-foreground mt-1">Gestiona y celebra los días especiales del club</p>
                </div>

                {isSuperAdmin && clubs && (
                    <div className="w-full sm:w-[300px] glass p-3 rounded-2xl border-indigo-500/20">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-2 block px-1">Súper Admin: Revisar Club</label>
                        <Select value={selectedClubId || ""} onValueChange={setSelectedClubId}>
                            <SelectTrigger className="h-10 bg-background/50 border-none shadow-none">
                                <SelectValue placeholder="Seleccionar Club" />
                            </SelectTrigger>
                            <SelectContent className="glass">
                                {clubs.map((c) => (
                                    <SelectItem key={c.id} value={c.id ?? ""}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
            </div>

            <div className="glass rounded-[2rem] overflow-hidden border-white/5">
                <div className="p-6 flex items-center justify-between bg-muted/20 border-b border-white/5">
                    <div className="flex items-center gap-4">
                        <h2 className="text-xl font-display font-bold text-foreground">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-xl hover:bg-primary/10">
                            <ChevronLeft className="h-5 w-5" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())} className="rounded-xl font-bold">
                            Hoy
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-xl hover:bg-primary/10">
                            <ChevronRight className="h-5 w-5" />
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-7 border-b border-white/5 bg-muted/10">
                    {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => (
                        <div key={day} className="py-3 text-center text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                            {day}
                        </div>
                    ))}
                </div>

                <div className="grid grid-cols-7">
                    {Array.from({ length: daysInMonth[0].getDay() }).map((_, i) => (
                        <div key={`empty-${i}`} className="h-32 sm:h-40 border-r border-b border-white/5 bg-muted/5 opacity-50" />
                    ))}
                    {daysInMonth.map(date => {
                        const day = date.getDate();
                        const dayBirthdays = birthdaysByDay[day] || [];
                        const active = isToday(day);

                        return (
                            <div
                                key={day}
                                className={cn(
                                    "h-32 sm:h-40 border-r border-b border-white/5 p-2 transition-colors relative group",
                                    active ? "bg-primary/5" : "hover:bg-muted/10"
                                )}
                            >
                                <span className={cn(
                                    "inline-flex h-6 w-6 items-center justify-center text-xs font-bold rounded-lg",
                                    active ? "bg-primary text-white shadow-lg shadow-primary/30" : "text-muted-foreground"
                                )}>
                                    {day}
                                </span>

                                <div className="mt-2 space-y-1 overflow-y-auto max-h-[80px] sm:max-h-[100px] no-scrollbar">
                                    {dayBirthdays.map((m, i) => (
                                        <motion.div
                                            key={m.id}
                                            initial={{ opacity: 0, x: -5 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.05 }}
                                            className="flex items-center gap-2 p-1 rounded-lg bg-background/50 border border-white/5 hover:border-primary/30 transition-colors"
                                        >
                                            <Avatar className="h-5 w-5 border border-primary/20">
                                                <AvatarImage src={getAvatarUrl(m.avatar_url)} />
                                                <AvatarFallback className="text-[8px] font-bold">
                                                    {m.full_name?.substring(0, 2).toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                            <span className="text-[9px] font-bold truncate text-foreground">{m.full_name.split(' ')[0]}</span>
                                        </motion.div>
                                    ))}
                                </div>

                                {dayBirthdays.length > 0 && (
                                    <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Cake className="h-4 w-4 text-primary animate-bounce" />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
