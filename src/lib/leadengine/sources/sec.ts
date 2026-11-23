import "server-only";
import type { NewLead } from "../leads";

/**
 * SEC Form D — every US company that raises private money must file one, with its address,
 * phone, executives and amount raised. Free; SEC asks tools to send a User-Agent with a
 * contact, set as SEC_USER_AGENT in .env.local.
 */
export async function runSec(params: { days: number; states: string[]; minAmount: number }): Promise<{ leads: NewLead[]; note: string }> {
  const ua = process.env.SEC_USER_AGENT?.trim();
  if (!ua) throw new Error("SEC needs a contact: add SEC_USER_AGENT (your company name + email) in Vercel → Settings → Environment Variables, then redeploy");
  const headers = { "User-Agent": ua, Accept: "application/json" };
  const end = new Date();
  const start = new Date(end.getTime() - Math.max(1, Math.min(30, params.days)) * 86_400_000);
  const d = (x: Date) => x.toISOString().slice(0, 10);

  type Hit = { _id: string; _source: { ciks: string[]; display_names: string[]; biz_states?: string[]; biz_locations?: string[]; file_date: string } };
  const hits: Hit[] = [];
  for (let from = 0; from < 1000; from += 100) {
    const url = `https://efts.sec.gov/LATEST/search-index?forms=D&dateRange=custom&startdt=${d(start)}&enddt=${d(end)}&from=${from}`;
    const data = (await fetch(url, { headers, cache: "no-store", signal: AbortSignal.timeout(20000) }).then((r) => r.json())) as { hits?: { hits: Hit[]; total: { value: number } } };
    const page = data.hits?.hits ?? [];
    hits.push(...page.filter((h) => !params.states.length || params.states.includes(h._source.biz_states?.[0] ?? "")));
    if (page.length < 100) break;
    await new Promise((r) => setTimeout(r, 200));
  }

  const leads: NewLead[] = [];
  const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([^<]*)</${name}>`))?.[1]?.trim() ?? null;
  for (const h of hits.slice(0, 300)) {
    const [adsh, file] = h._id.split(":");
    const cik = h._source.ciks[0]?.replace(/^0+/, "");
    if (!cik || !file) continue;
    const xml = await fetch(`https://www.sec.gov/Archives/edgar/data/${cik}/${adsh.replace(/-/g, "")}/${file}`, { headers, cache: "no-store", signal: AbortSignal.timeout(20000) })
      .then((r) => (r.ok ? r.text() : ""))
      .catch(() => "");
    await new Promise((r) => setTimeout(r, 150)); // SEC: max 10 requests a second
    if (!xml) continue;
    const industry = tag(xml, "industryGroupType");
    // Investment funds are not businesses that buy services.
    if (!industry || /Pooled Investment Fund|REITS|Other Banking/i.test(industry)) continue;
    const sold = Number(tag(xml, "totalAmountSold") ?? 0);
    if (sold < params.minAmount) continue;
    const people = [...xml.matchAll(/<relatedPersonName>[\s\S]*?<firstName>([^<]*)<\/firstName>[\s\S]*?<lastName>([^<]*)<\/lastName>/g)].map((m) => `${m[1]} ${m[2]}`).slice(0, 4);
    const city = tag(xml, "city");
    leads.push({
      source: "sec",
      sourceId: adsh,
      kind: "company",
      name: tag(xml, "entityName") ?? h._source.display_names[0]?.replace(/\s*\(CIK.*$/, "") ?? "Unknown",
      category: industry,
      city: city ? city.replace(/\b\w+/g, (w) => w[0] + w.slice(1).toLowerCase()) : null,
      state: tag(xml, "stateOrCountry"),
      address: [tag(xml, "street1"), city, tag(xml, "zipCode")].filter(Boolean).join(", "),
      phone: tag(xml, "issuerPhoneNumber"),
      extra: { amountRaised: sold, offering: Number(tag(xml, "totalOfferingAmount") ?? 0) || null, people, filed: h._source.file_date, yearOfInc: xml.match(/<yearOfInc>[\s\S]*?<value>(\d{4})<\/value>/)?.[1] ?? null },
    });
  }
  return { leads, note: `SEC Form D: ${hits.length} filings, ${leads.length} operating companies kept` };
}
