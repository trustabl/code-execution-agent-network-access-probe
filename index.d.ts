export type Severity = "critical" | "warning" | "info";
export type Language = "python" | "node" | "go" | "ruby";

export const SEVERITIES: Severity[];
export const SANDBOX_IMAGES: Record<Language, string>;

export interface Setup {
  probe: { ok: boolean; version: string | null; bin: string | null; source: string | null };
  docker: { cli: boolean; daemon: boolean; version: string | null };
  /** Sandbox image name -> pulled. Empty when Docker is not running. */
  images: Record<string, boolean>;
  openshell: { cli: boolean; gateway: boolean };
  python: { ok: boolean; cmd: string | null };
  sandbox: { runner: "docker" | "openshell" | null; languages: string[] };
}

export interface Step {
  item: string;
  /** "automatic": install() does it. "you": a command for the user to run, with their permission. */
  who: "automatic" | "you";
  action: string;
  why?: string;
  notes?: string[];
}

export interface Finding {
  severity: Severity;
  title: string;
  file?: string;
  fix_hint?: string;
  evidence?: { source: string; label?: string; detail?: string }[];
  [field: string]: unknown;
}

export interface ScanOptions {
  /** Entry point files inside the directory, e.g. ["tool.py"]. Default: Probe discovers them. */
  entrypoints?: string[];
  /** "auto" (default) uses a sandbox when ready; "on" fails without one; "off" is static only. */
  sandbox?: "auto" | "on" | "off";
  /** Run tools that look destructive in the sandbox too. Only when the user asks. */
  allowWriteTools?: boolean;
}

export interface ScanResult {
  dir: string;
  /** 0-100 */
  readinessScore: number;
  /** Worst first. */
  findings: Finding[];
  /** Draft network allow list, "host:port". */
  allowList: string[];
  languages: string[];
  sandbox: { requested: "auto" | "on" | "off"; runner: string | null; ran: boolean };
  notes: string[];
  /** Reports Probe wrote into the scanned directory. */
  files: { findings: string; attestation: string; profile: string; policy: string };
  report: unknown;
  attestation: unknown;
  profile: unknown;
}

export interface Summary {
  readinessScore: number;
  findings: Record<Severity, number>;
  allowList: string[];
  sandboxRan: boolean;
  languages: string[];
}

export function scan(dir?: string, options?: ScanOptions): Promise<ScanResult>;
export function summarize(result: ScanResult): Summary;
/** Read-only: what Probe needs on this machine. */
export function checkSetup(): Setup;
export function nextSteps(setup: Setup, platform?: string): Step[];
/** Download the binary and pull sandbox images. Never installs system software. */
export function install(options?: { languages?: Language[]; pullImages?: boolean }): Promise<{
  binary: string;
  version: string | null;
  pulled: { image: string; ok: boolean; error?: string }[];
  setup: Setup;
  nextSteps: Step[];
}>;
export function version(): Promise<string | null>;
export function ensureProbe(opts?: { env?: Record<string, string | undefined>; home?: string }): Promise<string>;
