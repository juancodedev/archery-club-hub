export const isMembershipCategory = (cat: string) => {
    if (!cat) return false;
    const c = cat.toLowerCase();
    return c === 'membresía' || c === 'membresia' || c === 'cuota mensual';
};

export const isInscriptionCategory = (cat: string) => {
    if (!cat) return false;
    const c = cat.toLowerCase();
    return c === 'inscripción' || c === 'inscripcion' || c === 'membresía inicial';
};

export interface MemberForStatus {
    status: string;
    enrollment_date: string;
    billing_day?: number;
    grace_days?: number;
}

export interface PaymentForStatus {
    category: string;
    payment_month: number;
    payment_year: number;
}

export const calculateFinancialStatus = (member: MemberForStatus | null | undefined, payments: PaymentForStatus[]): string => {
    if (!member || !payments) return "cargando";
    if (member.status === "inactivo") return "vigente";

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    const enrollmentDate = new Date(member.enrollment_date);
    const enrollmentMonth = enrollmentDate.getMonth() + 1;
    const enrollmentYear = enrollmentDate.getFullYear();

    const billingDay = member.billing_day || enrollmentDate.getDate();
    const graceDays = member.grace_days ?? 7;

    // 1. Check current month Cuota
    const hasPaidCurrentCuota = payments.some(p =>
        isMembershipCategory(p.category) &&
        p.payment_month === currentMonth &&
        p.payment_year === currentYear
    );

    // 2. If it's the enrollment month, also check Inscription
    const isFirstMonth = currentMonth === enrollmentMonth && currentYear === enrollmentYear;
    let hasPaidInscription = true;

    if (isFirstMonth || enrollmentYear < currentYear || (enrollmentYear === currentYear && enrollmentMonth < currentMonth)) {
        hasPaidInscription = payments.some(p => isInscriptionCategory(p.category));
    }

    // 3. Determine if overdue
    // If missing either in the first month
    if (isFirstMonth) {
        if (!hasPaidCurrentCuota || !hasPaidInscription) {
            if (now.getDate() > (billingDay + graceDays)) {
                return "atrasado";
            }
        }
        return "vigente";
    }

    // If past first month
    if (!hasPaidCurrentCuota && now.getDate() > (billingDay + graceDays)) {
        return "atrasado";
    }

    // Check if any past month (after enrollment) is missing
    // For simplicity, we mostly care about the current and first month for the "badge"
    // but the user logic implies checking "if next month doesn't have payment, appear as overdue"

    return "vigente";
};
