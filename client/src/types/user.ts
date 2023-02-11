interface Version {
  id: number;
  name: string;
}

export interface User {
  avatar?: string;
  email: string;
  name: string;
  projectName: string;
  versions: Version[];
}
