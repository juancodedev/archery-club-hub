import { useState, useMemo } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContextCore";
import { supabase } from "@/integrations/supabase/client";
import type { TablesInsert, Json } from "@/integrations/supabase/types";
import { useToast } from "@/hooks/use-toast";
import type { ClubOption } from "@/hooks/useClubs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DISCIPLINES,
  STANDARD_DISTANCES,
  TRAINING_TYPES,
  WEATHER_TYPES,
  WIND_DIRECTIONS,
  TRAINING_PRESETS,
  NFAA_DISCIPLINES,
  NFAA_BOW_STYLES,
  NFAA_AGE_CATEGORIES,
  NFAA_GENDERS,
  INDOOR_TARGET_TYPES,
  SESSION_MODES,
  NFAA_ALL_DIVISIONS,
} from "@/lib/archeryConstants";
import { buildDivisionCode } from "@/lib/divisionUtils";
import { MapPin, Settings2, Search, Trophy, Pencil, Trash2 } from "lucide-react";

interface TrainingSessionDialogProps {
  clubId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isSuperAdmin: boolean;
  clubs?: ClubOption[];
}

export default function TrainingSessionDialog({
  clubId,
  open,
  onOpenChange,
  isSuperAdmin,
  clubs,
}: TrainingSessionDialogProps) {
  const { member } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Form state
  const [trainingType, setTrainingType] = useState<string>("libre");
  const [name, setName] = useState("");
  const [eventDate, setEventDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [discipline, setDiscipline] = useState<string>("");
  const [distanceYards, setDistanceYards] = useState<string>("");
  const [targetType, setTargetType] = useState("");
  const [detail, setDetail] = useState("");
  const [dialogClubId, setDialogClubId] = useState("");

  // Rounds for estandar
  const [rounds, setRounds] = useState<
    {
      distance: number;
      target: string;
      ends: number;
      arrows: number;
      presetId?: string;
    }[]
  >([]);

  // Weather / equipment
  const [weather, setWeather] = useState("");
  const [windDirection, setWindDirection] = useState("");
  const [windSpeed, setWindSpeed] = useState("");
  const [bowInfo, setBowInfo] = useState("");
  const [arrowInfo, setArrowInfo] = useState("");
  const [arrowNumbers, setArrowNumbers] = useState(false);
  const [location, setLocation] = useState("");

  // Torneo state
  const [sessionMode, setSessionMode] = useState<"practice" | "tournament">(
    "practice"
  );
  const [nfaaDiscipline, setNfaaDiscipline] = useState("");
  const [tournamentName, setTournamentName] = useState("");
  const [tournamentCity, setTournamentCity] = useState("");
  const [ageCategory, setAgeCategory] = useState("");
  const [gender, setGender] = useState("");
  const [bowStyle, setBowStyle] = useState("");
  const [divisionSearch, setDivisionSearch] = useState("");
  const [indoorTargetType, setIndoorTargetType] = useState("");
  const [std1Score, setStd1Score] = useState("");
  const [std1X, setStd1X] = useState("");
  const [std2Score, setStd2Score] = useState("");
  const [std2X, setStd2X] = useState("");
  const [eqBow, setEqBow] = useState("");
  const [eqLimbs, setEqLimbs] = useState("");
  const [eqString, setEqString] = useState("");
  const [eqTab, setEqTab] = useState("");
  const [eqRelease, setEqRelease] = useState("");
  const [eqSight, setEqSight] = useState("");
  const [eqStabilizer, setEqStabilizer] = useState("");
  const [equipmentNotes, setEquipmentNotes] = useState("");

  // Derived values
  const divisionCode = useMemo(
    () => buildDivisionCode(ageCategory, gender, bowStyle),
    [ageCategory, gender, bowStyle]
  );

  const matchedDivisions = useMemo(
    () =>
      divisionSearch.length >= 2
        ? NFAA_ALL_DIVISIONS.filter((d) =>
            d.code.toLowerCase().startsWith(divisionSearch.toLowerCase())
          ).slice(0, 8)
        : [],
    [divisionSearch]
  );

  const indoorTotalScore =
    (parseInt(std1Score) || 0) + (parseInt(std2Score) || 0);
  const indoorTotalX = (parseInt(std1X) || 0) + (parseInt(std2X) || 0);

  const equipmentSummary = [eqBow, eqLimbs].filter(Boolean).join(" – ");

  const filteredDistances = discipline
    ? STANDARD_DISTANCES.filter((d) => d.discipline === discipline)
    : STANDARD_DISTANCES;

  // Create session mutation
  const createSession = useMutation({
    mutationFn: async () => {
      const targetClubId = isSuperAdmin ? dialogClubId : clubId;
      if (!targetClubId || targetClubId === "null")
        throw new Error("Debe seleccionar un club");

      const isVirtual = member?.id?.startsWith("00000000");
      const creatorId = member?.id && !isVirtual ? member.id : null;

      if (trainingType === "torneo") {
        if (!nfaaDiscipline) {
          throw new Error("Debe seleccionar una disciplina");
        }
        const tournamentRoundsConfig: Json = {
          sessionMode,
          tournamentCity,
          nfaaDiscipline,
          divisionCode,
          indoorTargetType:
            nfaaDiscipline === "indoor" ? indoorTargetType : null,
          std1Score:
            nfaaDiscipline === "indoor" ? parseInt(std1Score) || 0 : null,
          std1X: nfaaDiscipline === "indoor" ? parseInt(std1X) || 0 : null,
          std2Score:
            nfaaDiscipline === "indoor" ? parseInt(std2Score) || 0 : null,
          std2X: nfaaDiscipline === "indoor" ? parseInt(std2X) || 0 : null,
          totalScore: nfaaDiscipline === "indoor" ? indoorTotalScore : null,
          totalX: nfaaDiscipline === "indoor" ? indoorTotalX : null,
          equipment: {
            bow: eqBow,
            limbs: eqLimbs,
            string: eqString,
            tab: eqTab,
            release: eqRelease,
            sight: eqSight,
            stabilizer: eqStabilizer,
          },
        };
        const disciplineLabel =
          NFAA_DISCIPLINES.find((d) => d.value === nfaaDiscipline)?.label ??
          nfaaDiscipline.toUpperCase();
        const sessionLabel =
          sessionMode === "tournament"
            ? `${tournamentName || "Torneo"} – ${disciplineLabel}`
            : `Práctica ${disciplineLabel}`;

        const tournamentPayload: TablesInsert<"training_sessions"> = {
          club_id: targetClubId,
          created_by: creatorId,
          name: sessionLabel,
          event_date: eventDate,
          discipline: nfaaDiscipline || null,
          division: divisionCode || null,
          detail:
            sessionMode === "tournament" ? tournamentName || null : null,
          target_type:
            nfaaDiscipline === "indoor" ? indoorTargetType || null : null,
          training_type: "libre",
          rounds_config: tournamentRoundsConfig,
          bow_info: equipmentSummary || null,
          arrow_info: equipmentNotes || null,
          location:
            sessionMode === "tournament" ? tournamentCity || location : location,
          weather,
          wind_direction: windDirection,
          wind_speed: windSpeed,
          arrow_numbers: arrowNumbers,
        };
        const { error } = await supabase
          .from("training_sessions")
          .insert(tournamentPayload);
        if (error) throw error;
        return;
      }

      const [distYards] = distanceYards.split("-");
      const { error } = await supabase.from("training_sessions").insert({
        club_id: targetClubId,
        created_by: creatorId,
        name,
        event_date: eventDate,
        division: discipline || null,
        discipline: discipline || null,
        distance_yards:
          distYards && distYards !== "custom"
            ? parseFloat(distYards)
            : null,
        target_type: targetType || null,
        detail: detail || null,
        training_type: trainingType as "libre" | "estandar",
        rounds_config: rounds,
        weather,
        wind_direction: windDirection,
        wind_speed: windSpeed,
        bow_info: bowInfo,
        arrow_info: arrowInfo,
        arrow_numbers: arrowNumbers,
        location,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["training-sessions"] });
      toast({ title: "Sesión creada exitosamente" });
      onOpenChange(false);
      resetForm();
    },
    onError: (e: Error) =>
      toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  function resetForm() {
    setName("");
    setDiscipline("");
    setDistanceYards("");
    setTargetType("");
    setDetail("");
    setDialogClubId("");
    setTrainingType("libre");
    setRounds([]);
    setWeather("");
    setWindDirection("");
    setWindSpeed("");
    setBowInfo("");
    setArrowInfo("");
    setArrowNumbers(false);
    setLocation("");
    setSessionMode("practice");
    setNfaaDiscipline("");
    setTournamentName("");
    setTournamentCity("");
    setAgeCategory("");
    setGender("");
    setBowStyle("");
    setDivisionSearch("");
    setIndoorTargetType("");
    setStd1Score("");
    setStd1X("");
    setStd2Score("");
    setStd2X("");
    setEqBow("");
    setEqLimbs("");
    setEqString("");
    setEqTab("");
    setEqRelease("");
    setEqSight("");
    setEqStabilizer("");
    setEquipmentNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-3xl glass max-w-[95vw] sm:max-w-lg scrollbar-hide max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display font-bold text-xl">
            Crear Sesión de Entrenamiento
          </DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createSession.mutate();
          }}
          className="space-y-5 pt-4"
        >
          {isSuperAdmin && (
            <div className="space-y-2">
              <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                Club para el entrenamiento
              </Label>
              <Select value={dialogClubId} onValueChange={setDialogClubId}>
                <SelectTrigger className="glass h-11">
                  <SelectValue placeholder="Seleccionar club" />
                </SelectTrigger>
                <SelectContent className="glass">
                  {clubs?.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
              Fecha del Evento
            </Label>
            <Input
              type="date"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
              required
              className="h-11 glass border-primary/10"
            />
          </div>

          {/* Tipo de Entrenamiento TABS */}
          <Tabs
            value={trainingType}
            onValueChange={setTrainingType}
            className="w-full"
          >
            <TabsList className="grid grid-cols-3 w-full glass p-1 h-12 mb-4">
              {TRAINING_TYPES.map((t) => (
                <TabsTrigger
                  key={t.value}
                  value={t.value}
                  className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
                >
                  {t.icon} {t.label}
                </TabsTrigger>
              ))}
              <TabsTrigger
                value="torneo"
                className="rounded-xl font-bold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                🏆 Torneo/Práctica
              </TabsTrigger>
            </TabsList>

            <TabsContent
              value="libre"
              className="space-y-4 animate-in fade-in-50 duration-300"
            >
              <div className="space-y-2">
                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                  Nombre de la Sesión
                </Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Práctica Libre - Calentamiento"
                  required
                  className="h-11 glass border-primary/10"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                    Disciplina
                  </Label>
                  <Select
                    value={discipline}
                    onValueChange={(v) => {
                      setDiscipline(v);
                      setDistanceYards("");
                    }}
                  >
                    <SelectTrigger className="glass h-11">
                      <SelectValue placeholder="..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {DISCIPLINES.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.icon} {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                    Distancia
                  </Label>
                  <Select
                    value={distanceYards}
                    onValueChange={setDistanceYards}
                    disabled={!discipline}
                  >
                    <SelectTrigger className="glass h-11">
                      <SelectValue placeholder="..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {filteredDistances.map((d) => (
                        <SelectItem
                          key={`${d.yards}-${d.discipline}`}
                          value={`${d.yards}-${d.discipline}`}
                        >
                          {d.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">Otra...</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                  Diana / Target
                </Label>
                <Input
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  placeholder="Ej: 40 cm"
                  className="h-11 glass border-primary/10"
                />
              </div>
            </TabsContent>

            {/* ─── TAB: TORNEO / PRÁCTICA ─────────────────────────────── */}
            <TabsContent
              value="torneo"
              className="space-y-4 animate-in fade-in-50 duration-300"
            >
              {/* 1. Modalidad toggle */}
              <div className="grid grid-cols-2 gap-2">
                {SESSION_MODES.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    aria-pressed={sessionMode === m.value}
                    onClick={() =>
                      setSessionMode(m.value as "practice" | "tournament")
                    }
                    className={cn(
                      "flex items-center justify-center gap-2 h-11 rounded-xl border font-bold text-sm transition-all",
                      sessionMode === m.value
                        ? "bg-primary text-primary-foreground border-primary shadow-lg shadow-primary/20"
                        : "glass border-white/10 text-muted-foreground hover:border-primary/30"
                    )}
                  >
                    {m.value === "tournament" ? (
                      <Trophy className="h-4 w-4" />
                    ) : (
                      <Pencil className="h-4 w-4" />
                    )}
                    {m.label}
                  </button>
                ))}
              </div>

              {/* 2. Nombre + Ciudad del torneo */}
              {sessionMode === "tournament" && (
                <div className="space-y-3 p-3 glass rounded-2xl border-primary/10 border">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                      Nombre del Torneo
                    </Label>
                    <Input
                      value={tournamentName}
                      onChange={(e) => setTournamentName(e.target.value)}
                      placeholder="Ej: Torneo Primavera 2025"
                      className="h-10 glass border-primary/10 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                      Ciudad
                    </Label>
                    <div className="relative">
                      <MapPin className="h-3 w-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={tournamentCity}
                        onChange={(e) => setTournamentCity(e.target.value)}
                        placeholder="Ej: La Serena"
                        className="h-10 glass border-primary/10 text-sm pl-8"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 3. Disciplina NFAA/IFAA */}
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  Disciplina
                </Label>
                <div className="grid grid-cols-4 gap-1.5">
                  {NFAA_DISCIPLINES.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      aria-pressed={nfaaDiscipline === d.value}
                      onClick={() => {
                        setNfaaDiscipline(d.value);
                        setIndoorTargetType("");
                      }}
                      className={cn(
                        "flex flex-col items-center gap-1 py-2 px-1 rounded-xl border text-[10px] font-bold transition-all",
                        nfaaDiscipline === d.value
                          ? "bg-primary/10 border-primary/50 text-primary"
                          : "glass border-white/5 text-muted-foreground hover:border-primary/20"
                      )}
                    >
                      <span className="text-lg">{d.icon}</span>
                      <span className="leading-none text-center">
                        {d.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 4. División */}
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                  División
                </Label>
                <div className="relative">
                  <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={divisionSearch}
                    onChange={(e) => setDivisionSearch(e.target.value)}
                    placeholder="Escribe código (ej: CFTR, AFBH-C…)"
                    className="h-10 glass border-primary/10 pl-9 text-sm font-mono"
                  />
                </div>
                {matchedDivisions.length > 0 && (
                  <div className="glass rounded-xl border border-primary/10 overflow-hidden">
                    {matchedDivisions.map((div) => (
                      <button
                        key={div.code}
                        type="button"
                        onClick={() => {
                          setAgeCategory(div.age);
                          setGender(div.gender);
                          setBowStyle(div.bowStyle);
                          setDivisionSearch("");
                        }}
                        className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-primary/5 transition-colors border-b border-white/5 last:border-none"
                      >
                        <span className="text-[11px] text-muted-foreground">
                          {div.label}
                        </span>
                        <span className="text-[10px] font-black font-mono text-primary">
                          {div.code}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Edad
                    </Label>
                    <Select
                      value={ageCategory}
                      onValueChange={setAgeCategory}
                    >
                      <SelectTrigger className="h-9 glass text-xs">
                        <SelectValue placeholder="…" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        {NFAA_AGE_CATEGORIES.map((a) => (
                          <SelectItem key={a.value} value={a.value}>
                            <span className="font-bold">{a.value}</span> –{" "}
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Género
                    </Label>
                    <Select value={gender} onValueChange={setGender}>
                      <SelectTrigger className="h-9 glass text-xs">
                        <SelectValue placeholder="…" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        {NFAA_GENDERS.map((g) => (
                          <SelectItem key={g.value} value={g.value}>
                            {g.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Estilo
                    </Label>
                    <Select value={bowStyle} onValueChange={setBowStyle}>
                      <SelectTrigger className="h-9 glass text-xs">
                        <SelectValue placeholder="…" />
                      </SelectTrigger>
                      <SelectContent className="glass">
                        {NFAA_BOW_STYLES.map((b) => (
                          <SelectItem key={b.value} value={b.value}>
                            {b.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {divisionCode && (
                  <div className="flex items-center gap-2 bg-primary/5 border border-primary/20 rounded-xl px-3 py-2">
                    <span className="text-[10px] text-muted-foreground">
                      División:
                    </span>
                    <Badge className="bg-primary text-primary-foreground font-mono text-xs tracking-wider px-2">
                      {divisionCode}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground">
                      {
                        NFAA_ALL_DIVISIONS.find(
                          (d) => d.code === divisionCode
                        )?.label
                      }
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Puntuación Indoor */}
              {nfaaDiscipline === "indoor" && (
                <div className="space-y-3 p-3 glass rounded-2xl border-blue-500/20 border">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] uppercase font-black tracking-widest text-blue-400">
                      🏠 Puntuación Indoor
                    </Label>
                    <div className="flex gap-1.5">
                      {INDOOR_TARGET_TYPES.map((t) => (
                        <button
                          key={t.value}
                          type="button"
                          onClick={() => setIndoorTargetType(t.value)}
                          className={cn(
                            "px-3 py-1 rounded-lg text-[10px] font-black border transition-all",
                            indoorTargetType === t.value
                              ? "bg-blue-500/20 border-blue-500/50 text-blue-400"
                              : "glass border-white/10 text-muted-foreground"
                          )}
                        >
                          {t.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="glass p-3 rounded-xl border-white/5 space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground text-center">
                        1er Standard
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground">
                            Puntuación
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={600}
                            value={std1Score}
                            onChange={(e) => setStd1Score(e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm glass text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground">
                            # de X
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={std1X}
                            onChange={(e) => setStd1X(e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm glass text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="glass p-3 rounded-xl border-white/5 space-y-2">
                      <p className="text-[10px] font-black uppercase text-muted-foreground text-center">
                        2do Standard
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground">
                            Puntuación
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            max={600}
                            value={std2Score}
                            onChange={(e) => setStd2Score(e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm glass text-center font-mono"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold text-muted-foreground">
                            # de X
                          </Label>
                          <Input
                            type="number"
                            min={0}
                            value={std2X}
                            onChange={(e) => setStd2X(e.target.value)}
                            placeholder="0"
                            className="h-9 text-sm glass text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-6 bg-primary/5 rounded-xl py-2 border border-primary/10">
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-muted-foreground">
                        Total Puntos
                      </p>
                      <p className="text-xl font-black text-primary tabular-nums">
                        {indoorTotalScore}
                      </p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="text-[9px] uppercase font-black text-muted-foreground">
                        Total X
                      </p>
                      <p className="text-xl font-black text-amber-400 tabular-nums">
                        {indoorTotalX}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent
              value="estandar"
              className="space-y-4 animate-in fade-in-50 duration-300"
            >
              <div className="space-y-2">
                <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                  Presets de Serie
                </Label>
                <div className="grid grid-cols-2 gap-2">
                  {TRAINING_PRESETS.map((p) => (
                    <Button
                      key={p.id}
                      type="button"
                      variant="outline"
                      className={cn(
                        "h-auto py-3 px-3 flex flex-col items-start gap-1 glass border-white/10",
                        rounds.length > 0 &&
                          rounds[0].presetId === p.id &&
                          "border-primary bg-primary/5"
                      )}
                      onClick={() => {
                        setRounds(
                          p.rounds.map((r) => ({ ...r, presetId: p.id }))
                        );
                        setName(`Serie: ${p.name}`);
                      }}
                    >
                      <span className="font-bold text-[11px] leading-tight">
                        {p.name}
                      </span>
                      <span className="text-[9px] text-muted-foreground leading-tight text-left">
                        {p.description}
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                    Configuración de Rondas
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[10px] font-black uppercase text-primary"
                    onClick={() =>
                      setRounds([
                        ...rounds,
                        {
                          distance: 55,
                          target: "122 cm",
                          ends: 6,
                          arrows: 6,
                        },
                      ])
                    }
                  >
                    + Agregar Ronda
                  </Button>
                </div>
                <div className="space-y-3 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar">
                  {rounds.map((round, idx) => (
                    <div
                      key={idx}
                      className="glass p-3 rounded-2xl border-white/5 space-y-3 relative group"
                    >
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() =>
                          setRounds(rounds.filter((_, i) => i !== idx))
                        }
                      >
                        <Trash2 className="h-3 w-3 text-destructive" />
                      </Button>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                            Distancia (yd)
                          </Label>
                          <Input
                            type="number"
                            value={round.distance}
                            onChange={(e) => {
                              const newRounds = [...rounds];
                              newRounds[idx].distance = parseFloat(
                                e.target.value
                              );
                              setRounds(newRounds);
                            }}
                            className="h-8 text-xs glass"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                            Diana
                          </Label>
                          <Input
                            value={round.target}
                            onChange={(e) => {
                              const newRounds = [...rounds];
                              newRounds[idx].target = e.target.value;
                              setRounds(newRounds);
                            }}
                            className="h-8 text-xs glass"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                            Ends
                          </Label>
                          <Input
                            type="number"
                            value={round.ends}
                            onChange={(e) => {
                              const newRounds = [...rounds];
                              newRounds[idx].ends = parseInt(e.target.value);
                              setRounds(newRounds);
                            }}
                            className="h-8 text-xs glass"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                            Flechas x End
                          </Label>
                          <Input
                            type="number"
                            value={round.arrows}
                            onChange={(e) => {
                              const newRounds = [...rounds];
                              newRounds[idx].arrows = parseInt(e.target.value);
                              setRounds(newRounds);
                            }}
                            className="h-8 text-xs glass"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Metadatos (Clima / Equipo) */}
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <Settings2 className="h-3.5 w-3.5 text-primary" />
              <Label className="text-[10px] uppercase font-black tracking-[0.2em] text-muted-foreground">
                Condiciones y Equipo
              </Label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Clima
                </Label>
                <Select value={weather} onValueChange={setWeather}>
                  <SelectTrigger className="glass h-10 text-xs">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="glass">
                    {WEATHER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Ubicación
                </Label>
                <div className="relative">
                  <MapPin className="h-3 w-3 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="Ej: Club Central"
                    className="h-10 text-xs glass pl-8"
                  />
                </div>
              </div>
            </div>

            <div
              className={`grid gap-3 ${
                trainingType === "torneo" ? "grid-cols-1" : "grid-cols-3"
              }`}
            >
              <div
                className={`space-y-2 ${
                  trainingType !== "torneo" ? "col-span-2" : ""
                }`}
              >
                <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Viento
                </Label>
                <div className="flex gap-2">
                  <Select
                    value={windDirection}
                    onValueChange={setWindDirection}
                  >
                    <SelectTrigger className="glass h-10 text-xs flex-1">
                      <SelectValue placeholder="..." />
                    </SelectTrigger>
                    <SelectContent className="glass">
                      {WIND_DIRECTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.icon} {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={windSpeed}
                    onChange={(e) => setWindSpeed(e.target.value)}
                    placeholder="Km/h"
                    className="h-10 text-xs glass w-20"
                  />
                </div>
              </div>
              {trainingType !== "torneo" && (
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Arco
                  </Label>
                  <Input
                    value={bowInfo}
                    onChange={(e) => setBowInfo(e.target.value)}
                    placeholder="Ej: Win&Win"
                    className="h-10 text-xs glass"
                  />
                </div>
              )}
            </div>

            {/* Equipo detallado (para tab torneo activo) */}
            {trainingType === "torneo" && (
              <div className="space-y-3 pt-2">
                <p className="text-[9px] uppercase font-black tracking-widest text-muted-foreground">
                  Detalle de Equipo
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Marca/Modelo Arco
                    </Label>
                    <Input
                      value={eqBow}
                      onChange={(e) => setEqBow(e.target.value)}
                      placeholder="Ej: Win&Win Inno EX"
                      className="h-9 text-xs glass"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Palas (marca, peso)
                    </Label>
                    <Input
                      value={eqLimbs}
                      onChange={(e) => setEqLimbs(e.target.value)}
                      placeholder="Ej: Mybo X7 36#"
                      className="h-9 text-xs glass"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Cuerda
                    </Label>
                    <Input
                      value={eqString}
                      onChange={(e) => setEqString(e.target.value)}
                      placeholder="Ej: BCY 8125 16h"
                      className="h-9 text-xs glass"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Tab / Dactilera / Guante
                    </Label>
                    <Input
                      value={eqTab}
                      onChange={(e) => setEqTab(e.target.value)}
                      placeholder="Ej: Shibuya Ultima"
                      className="h-9 text-xs glass"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Mira
                    </Label>
                    <Input
                      value={eqSight}
                      onChange={(e) => setEqSight(e.target.value)}
                      placeholder="Ej: Shrewd Micro"
                      className="h-9 text-xs glass"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                      Estabilizador
                    </Label>
                    <Input
                      value={eqStabilizer}
                      onChange={(e) => setEqStabilizer(e.target.value)}
                      placeholder="Ej: Doinker A27"
                      className="h-9 text-xs glass"
                    />
                  </div>
                  {(bowStyle === "BH-C" ||
                    bowStyle === "FS-C" ||
                    bowStyle === "FU" ||
                    bowStyle === "BB-C") && (
                    <div className="space-y-1 col-span-2">
                      <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                        Disparador
                      </Label>
                      <Input
                        value={eqRelease}
                        onChange={(e) => setEqRelease(e.target.value)}
                        placeholder="Ej: Stan SX3"
                        className="h-9 text-xs glass"
                      />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <Label className="text-[9px] font-bold uppercase text-muted-foreground">
                    Notas de Equipo y Observaciones
                  </Label>
                  <Textarea
                    value={equipmentNotes}
                    onChange={(e) => setEquipmentNotes(e.target.value)}
                    placeholder="Anota cambios en tu equipo, ajustes técnicos, observaciones de rendimiento..."
                    className="glass text-xs resize-none border-primary/10 min-h-[80px]"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between glass p-3 rounded-2xl border-white/5 mt-2">
              <div className="space-y-0.5">
                <Label className="text-[11px] font-bold">
                  Números de Flecha
                </Label>
                <p className="text-[9px] text-muted-foreground">
                  Registrar qué flecha cae dónde
                </p>
              </div>
              <Switch
                checked={arrowNumbers}
                onCheckedChange={setArrowNumbers}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          </div>

          {trainingType !== "torneo" && (
            <div className="space-y-2">
              <Label className="text-xs uppercase font-black tracking-widest text-muted-foreground">
                Detalle Opcional
              </Label>
              <Input
                value={detail}
                onChange={(e) => setDetail(e.target.value)}
                placeholder="Notas..."
                className="h-11 glass border-primary/10"
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 rounded-2xl font-black shadow-lg"
            disabled={createSession.isPending}
          >
            {createSession.isPending ? "Configurando..." : "CREAR SESIÓN AHORA"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
