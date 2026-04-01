export interface ProjectTag {
  name: string;
  color: string;
  icon?: string;
}

export interface Project {
  id: number;
  name: string;
  description: string;
  tags: ProjectTag[];
  color: string;
  icon_url: string;
  created_at: string;
  updated_at: string;
}
