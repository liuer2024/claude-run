export interface ProjectStat {
  /** absolute project path */
  full: string;
  /** number of (loaded) sessions in this project */
  count: number;
}

export interface ProjectItem {
  full: string;
  name: string;
  count: number;
}

export interface ProjectGroup {
  /** display label for the parent directory (home-abbreviated) */
  label: string;
  /** the raw parent path, or "__other__" for the singles bucket */
  key: string;
  isOther: boolean;
  items: ProjectItem[];
  /** total sessions across the group's projects */
  sessions: number;
}

export interface GroupedProjects {
  groups: ProjectGroup[];
  /** number of projects (with sessions) */
  total: number;
  /** total sessions across all projects */
  totalSessions: number;
}

export function basename(p: string): string {
  const i = p.lastIndexOf("/");
  return i >= 0 ? p.slice(i + 1) : p;
}

/** Collapse a leading `/Users/<name>` or `/home/<name>` into `~`. */
function abbrevHome(p: string): string {
  return p.replace(/^\/(?:Users|home)\/[^/]+/, "~");
}

/**
 * Buckets projects by their parent directory. Directories holding a single
 * project are merged into a trailing "其他" (Other) group so the list stays
 * shallow. Groups are ordered by project count (desc), projects alphabetically.
 */
export function groupProjects(projects: ProjectStat[]): GroupedProjects {
  const byParent = new Map<string, ProjectItem[]>();
  let totalSessions = 0;
  for (const { full, count } of projects) {
    totalSessions += count;
    const i = full.lastIndexOf("/");
    const parent = i > 0 ? full.slice(0, i) : "/";
    const name = i >= 0 ? full.slice(i + 1) : full;
    const item: ProjectItem = { full, name, count };
    const bucket = byParent.get(parent);
    if (bucket) {
      bucket.push(item);
    } else {
      byParent.set(parent, [item]);
    }
  }

  const sumSessions = (items: ProjectItem[]) =>
    items.reduce((n, it) => n + it.count, 0);

  const multi: ProjectGroup[] = [];
  const singles: ProjectItem[] = [];
  for (const [parent, items] of byParent) {
    if (items.length >= 2) {
      items.sort((a, b) => a.name.localeCompare(b.name));
      multi.push({
        label: abbrevHome(parent),
        key: parent,
        isOther: false,
        items,
        sessions: sumSessions(items),
      });
    } else {
      singles.push(items[0]);
    }
  }

  multi.sort(
    (a, b) => b.items.length - a.items.length || a.label.localeCompare(b.label),
  );
  singles.sort((a, b) => a.name.localeCompare(b.name));

  const groups = [...multi];
  if (singles.length) {
    groups.push({
      label: "其他",
      key: "__other__",
      isOther: true,
      items: singles,
      sessions: sumSessions(singles),
    });
  }

  return { groups, total: projects.length, totalSessions };
}
