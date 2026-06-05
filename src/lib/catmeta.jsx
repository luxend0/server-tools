// Icon mapping for categories and individual tools (lucide-react, monochrome).
// CAT_ICON keys MUST match the English category labels in src/tools/index.js.
import {
  Binary, KeyRound, Braces, Type, Palette, Calculator, Network, ServerCog,
  Hash, Fingerprint, Dices, Table, FileCode, FileJson, Link, Clock, Timer,
  CaseSensitive, Pilcrow, BarChart3, Regex, Replace, ListOrdered, FlipHorizontal2,
  Contrast, Square, Blend, Percent, Thermometer, Ruler, HardDrive, MonitorSmartphone,
  ShieldBan, Router, AudioLines, Globe, Mail, Scaling, Hourglass, Server, Wrench,
} from 'lucide-react';

export const CAT_ICON = {
  'Encode / Decode': Binary,
  'Crypto / Generators': KeyRound,
  'Data / Format': Braces,
  'Text': Type,
  'Color / CSS': Palette,
  'Math / Calc': Calculator,
  'Network': Network,
  'Network (Backend)': ServerCog,
};

// Per-tool overrides keyed by tool id. Unknown ids fall back to the category icon.
const TOOL_ICON = {
  base64: Binary, base32: Binary, hex: Binary, binary: Binary, url: Link,
  html: FileCode, unicode: Type, morse: AudioLines, rot: KeyRound, jwt: KeyRound,
  jsonesc: Braces, base: Binary,
  hash: Hash, hmac: Hash, crc32: Hash, uuid: Fingerprint, nanoid: Fingerprint,
  pass: KeyRound, randbytes: Dices, randint: Dices,
  json: Braces, json2csv: Table, csv2json: Table, json2yaml: FileJson, query: Link,
  ts: Clock, datediff: Clock, duration: Hourglass, tz: Globe, cron: Timer,
  case: CaseSensitive, slug: Link, lorem: Pilcrow, count: BarChart3, wordfreq: BarChart3,
  regex: Regex, replace: Replace, lines: ListOrdered, reverse: FlipHorizontal2,
  color: Palette, contrast: Contrast, boxshadow: Square, radius: Square, gradient: Blend,
  percent: Percent, temp: Thermometer, len: Ruler, size: HardDrive, aspect: Scaling,
  cidr: Network, ipv4: Network, ipv6: Network, ipv6expand: Network, ipv6compress: Network,
  ua: MonitorSmartphone, dns: Globe, dnsall: Globe, 'dns-all': Globe, ptr: Globe,
  dnsbl: ShieldBan, email: Mail, rdap: Server, asn: Router,
};

export function iconForTool(tool) {
  return TOOL_ICON[tool.id] || CAT_ICON[tool.cat] || Wrench;
}
export function iconForCat(cat) {
  return CAT_ICON[cat] || Wrench;
}
