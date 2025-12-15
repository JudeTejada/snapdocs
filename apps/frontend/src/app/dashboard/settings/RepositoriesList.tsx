import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { FolderGit2 } from "lucide-react";

interface RepositoriesListProps {
  repositories: Array<{
    id: string;
    name: string;
    owner: string;
    private?: boolean;
  }>;
}

export function RepositoriesList({ repositories }: RepositoriesListProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FolderGit2 className="h-6 w-6" />
            <div>
              <CardTitle>Connected Repositories</CardTitle>
              <CardDescription>
                Repositories currently being monitored by SnapDocs
              </CardDescription>
            </div>
          </div>
          <Badge variant="outline">{repositories.length} repos</Badge>
        </div>
      </CardHeader>
      <CardContent>
        {repositories.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {repositories.map((repo) => (
              <div
                key={repo.id}
                className="flex items-center justify-between p-3 rounded-md bg-secondary/50 border border-border"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FolderGit2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {repo.owner}/{repo.name}
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-[10px] bg-background flex-shrink-0"
                >
                  {repo.private ? "Private" : "Public"}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p className="text-sm">
              No repositories found. Click &quot;Manage Repositories on GitHub&quot;
              to add repositories.
            </p>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-xs text-muted-foreground">
        <p>
          After adding or removing repositories on GitHub, click &quot;Re-sync
          Repositories&quot; to update this list.
        </p>
      </CardFooter>
    </Card>
  );
}
