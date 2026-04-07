const ARES_BASE = "https://ares.gov.cz/ekonomicke-subjekty-v-be/rest";

// --- Types for ARES API responses ---

interface AresSearchResult {
  pocetCelkem: number;
  ekonomickeSubjekty: AresSearchSubject[];
}

interface AresSearchSubject {
  ico: string;
  obchodniJmeno: string;
  sidlo: AresAdresa;
  pravniForma: string;
  datumVzniku: string;
  datumAktualizace: string;
  icoId: string;
}

interface AresAdresa {
  kodStatu?: string;
  nazevStatu?: string;
  nazevKraje?: string;
  nazevOkresu?: string;
  nazevObce?: string;
  nazevUlice?: string;
  cisloDomovni?: number;
  cisloOrientacni?: number;
  nazevCastiObce?: string;
  psc?: number;
  textovaAdresa?: string;
}

interface AresVrResponse {
  icoId: string;
  zaznamy: AresVrZaznam[];
}

interface AresVrZaznam {
  ico?: Array<{ hodnota?: string }>;
  obchodniJmeno: Array<{
    datumZapisu: string;
    datumVymazu?: string;
    hodnota: string;
  }>;
  adresy: Array<{
    datumZapisu: string;
    datumVymazu?: string;
    adresa: AresAdresa;
    typAdresy: string;
  }>;
  statutarniOrgany?: Array<{
    datumZapisu?: string;
    datumVymazu?: string;
    nazevOrganu?: string;
    typOrganu?: string;
    clenoveOrganu?: AresVrClen[];
  }>;
  spolecnici?: Array<{
    datumZapisu?: string;
    datumVymazu?: string;
    nazevOrganu?: string;
    spolecnik?: AresVrSpolecnik[];
  }>;
  pravniForma?: Array<{
    datumZapisu?: string;
    datumVymazu?: string;
    hodnota?: string;
  }>;
  datumZapisu?: string;
  datumVymazu?: string;
  stavSubjektu?: string;
}

interface AresVrClen {
  datumZapisu?: string;
  datumVymazu?: string;
  typAngazma?: string;
  nazevAngazma?: string;
  fyzickaOsoba?: {
    jmeno?: string;
    prijmeni?: string;
    titulPredJmenem?: string;
    titulZaJmenem?: string;
    datumNarozeni?: string;
  };
  pravnickaOsoba?: {
    obchodniJmeno?: string;
    ico?: string;
  };
  clenstvi?: {
    datumZapisu?: string;
    datumVymazu?: string;
    funkce?: string;
  };
}

interface AresVrSpolecnik {
  datumZapisu?: string;
  datumVymazu?: string;
  podil?: Array<{
    vklad?: { hodnota?: string; typObnos?: string };
    velikostPodilu?: { hodnota?: string; typObnos?: string };
    splaceni?: { hodnota?: string; typObnos?: string };
  }>;
  osoba?: {
    datumZapisu?: string;
    datumVymazu?: string;
    typAngazma?: string;
    nazevAngazma?: string;
    fyzickaOsoba?: {
      jmeno?: string;
      prijmeni?: string;
      titulPredJmenem?: string;
      titulZaJmenem?: string;
    };
    pravnickaOsoba?: {
      obchodniJmeno?: string;
      ico?: string;
    };
  };
}

// --- Mapped types for our DB ---

export interface CompanyBasic {
  ico: string;
  name: string;
  address: string;
  city: string;
  region?: string;
  district?: string;
}

export interface CompanyDetail extends CompanyBasic {
  legalForm?: string;
  dateCreated?: string;
  dateDeleted?: string;
  status?: string;
  statutoryMembers: {
    firstName?: string;
    lastName?: string;
    titleBefore?: string;
    titleAfter?: string;
    role?: string;
    dateFrom?: string;
    dateTo?: string;
  }[];
  shareholders: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
    shareholderIco?: string;
    shareText?: string;
    dateFrom?: string;
    dateTo?: string;
  }[];
}

// --- API Functions ---

export async function searchCompanies(
  query: string,
  start: number = 0,
  count: number = 50
): Promise<{ total: number; companies: CompanyBasic[] }> {
  const isIco = /^\d{7,8}$/.test(query.trim());

  const body: Record<string, unknown> = {
    start,
    pocet: count,
  };

  if (isIco) {
    body.ico = [query.trim().padStart(8, "0")];
  } else {
    body.obchodniJmeno = query.trim();
  }

  const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty/vyhledat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 404) return { total: 0, companies: [] };
    // Handle ARES-specific errors (e.g. too many results)
    try {
      const err = await res.json();
      if (err.subKod === "VYSTUP_PRILIS_MNOHO_VYSLEDKU") {
        throw new Error("Příliš mnoho výsledků. Upřesněte hledaný výraz.");
      }
      throw new Error(err.popis?.split("|")[0] || `ARES search failed: ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.message !== `ARES search failed: ${res.status}`) throw e;
      throw new Error(`ARES search failed: ${res.status}`);
    }
  }

  const data: AresSearchResult = await res.json();

  const companies: CompanyBasic[] = (data.ekonomickeSubjekty || []).map(
    (s) => ({
      ico: s.ico,
      name: s.obchodniJmeno,
      address: s.sidlo?.textovaAdresa || "",
      city: s.sidlo?.nazevObce || "",
      region: s.sidlo?.nazevKraje,
      district: s.sidlo?.nazevOkresu,
    })
  );

  return { total: data.pocetCelkem, companies };
}

// --- Sync search: search by name prefix + legal form ---

export async function searchByPrefix(
  prefix: string,
  legalForm: string,
  start: number = 0,
  count: number = 1000
): Promise<{ total: number; companies: CompanyBasic[]; legalForm: string }> {
  const body: Record<string, unknown> = {
    start,
    pocet: count,
    obchodniJmeno: prefix,
    pravniForma: [legalForm],
  };

  const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty/vyhledat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    if (res.status === 404) return { total: 0, companies: [], legalForm };
    try {
      const err = await res.json();
      if (err.subKod === "VYSTUP_PRILIS_MNOHO_VYSLEDKU") {
        return { total: Infinity, companies: [], legalForm };
      }
      throw new Error(
        err.popis?.split("|")[0] || `ARES search failed: ${res.status}`
      );
    } catch (e) {
      if (
        e instanceof Error &&
        e.message !== `ARES search failed: ${res.status}`
      )
        throw e;
      throw new Error(`ARES search failed: ${res.status}`);
    }
  }

  const data: AresSearchResult = await res.json();

  const companies: CompanyBasic[] = (data.ekonomickeSubjekty || []).map(
    (s) => ({
      ico: s.ico,
      name: s.obchodniJmeno,
      address: s.sidlo?.textovaAdresa || "",
      city: s.sidlo?.nazevObce || "",
      region: s.sidlo?.nazevKraje,
      district: s.sidlo?.nazevOkresu,
    })
  );

  return { total: data.pocetCelkem, companies, legalForm };
}

export async function getCompanyDetail(
  ico: string
): Promise<CompanyDetail | null> {
  const paddedIco = ico.trim().padStart(8, "0");

  const res = await fetch(`${ARES_BASE}/ekonomicke-subjekty-vr/${paddedIco}`, {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) {
    if (res.status === 404) return null;
    throw new Error(`ARES VR detail failed: ${res.status}`);
  }

  const data: AresVrResponse = await res.json();

  if (!data.zaznamy?.length) return null;

  const z = data.zaznamy[0];

  // Get current name (no datumVymazu)
  const currentName = z.obchodniJmeno.find((n) => !n.datumVymazu);
  const name = currentName?.hodnota || z.obchodniJmeno[0]?.hodnota || "";

  // Get current address (SIDLO, no datumVymazu)
  const currentAddr = z.adresy.find(
    (a) => a.typAdresy === "SIDLO" && !a.datumVymazu
  );
  const addr = currentAddr?.adresa;

  // Get current statutory members (no datumVymazu)
  const statutoryMembers: CompanyDetail["statutoryMembers"] = [];
  for (const organ of z.statutarniOrgany || []) {
    if (organ.typOrganu === "PROKURA") continue; // skip prokura
    for (const member of organ.clenoveOrganu || []) {
      if (member.datumVymazu) continue; // only current members
      const fo = member.fyzickaOsoba;
      const po = member.pravnickaOsoba;
      statutoryMembers.push({
        firstName: fo?.jmeno,
        lastName: fo?.prijmeni || po?.obchodniJmeno,
        titleBefore: fo?.titulPredJmenem,
        titleAfter: fo?.titulZaJmenem,
        role: member.nazevAngazma || organ.nazevOrganu,
        dateFrom: member.datumZapisu,
        dateTo: member.datumVymazu,
      });
    }
  }

  // Get current shareholders (no datumVymazu)
  const shareholders: CompanyDetail["shareholders"] = [];
  for (const group of z.spolecnici || []) {
    for (const sp of group.spolecnik || []) {
      if (sp.datumVymazu) continue; // only current
      const osoba = sp.osoba;
      const fo = osoba?.fyzickaOsoba;
      const po = osoba?.pravnickaOsoba;

      // Build share description
      let shareText: string | undefined;
      if (sp.podil?.length) {
        const podil = sp.podil[0];
        const parts: string[] = [];
        if (podil.velikostPodilu?.hodnota) {
          parts.push(`Podíl: ${podil.velikostPodilu.hodnota}`);
        }
        if (podil.vklad?.hodnota) {
          parts.push(`Vklad: ${podil.vklad.hodnota} Kč`);
        }
        if (podil.splaceni?.hodnota) {
          parts.push(`Splaceno: ${podil.splaceni.hodnota}%`);
        }
        shareText = parts.join(", ");
      }

      shareholders.push({
        firstName: fo?.jmeno,
        lastName: fo?.prijmeni,
        companyName: po?.obchodniJmeno,
        shareholderIco: po?.ico,
        shareText,
        dateFrom: sp.datumZapisu || osoba?.datumZapisu,
        dateTo: sp.datumVymazu || osoba?.datumVymazu,
      });
    }
  }

  // Legal form - get current
  const currentPf = z.pravniForma?.find((pf) => !pf.datumVymazu);

  return {
    ico: data.icoId,
    name,
    address: addr?.textovaAdresa || "",
    city: addr?.nazevObce || "",
    region: addr?.nazevKraje,
    district: addr?.nazevOkresu,
    legalForm: currentPf?.hodnota,
    dateCreated: z.datumZapisu,
    dateDeleted: z.datumVymazu,
    status: z.stavSubjektu,
    statutoryMembers,
    shareholders,
  };
}
