export function formatRUT(rut: string): string {
    // Remove dots and dash and keep only alphanumeric
    const value = rut.replace(/\./g, "").replace(/-/g, "").replace(/[^0-9kK]/g, "");

    if (value.length < 2) return value;

    const body = value.slice(0, -1);
    const dv = value.slice(-1).toUpperCase();

    // Add dots
    const formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formattedBody}-${dv}`;
}

export function cleanRUT(rut: string): string {
    return rut.replace(/\./g, "").replace(/-/g, "").toUpperCase();
}

export function validateRUT(rut: string): boolean {
    if (!rut) return false;
    const cleaned = cleanRUT(rut);
    if (cleaned.length < 8) return false;

    const body = cleaned.slice(0, -1);
    const dv = cleaned.slice(-1).toUpperCase();

    if (!/^\d+$/.test(body)) return false;

    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * multiplier;
        multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const expectedDV = 11 - (sum % 11);
    const calculatedDV = expectedDV === 11 ? "0" : expectedDV === 10 ? "K" : expectedDV.toString();

    return dv === calculatedDV;
}
