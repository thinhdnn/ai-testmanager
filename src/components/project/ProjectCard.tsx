import Link from 'next/link';
import { Calendar, Globe, Tag, ArrowUpRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  url: string;
  description: string | null;
  environment: string;
  updatedAt: Date | string;
  testCases?: any[];
}

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`} className="group block h-full">
      <Card className="h-full overflow-hidden transition-all duration-300 border-border hover:border-primary/50 hover:shadow-md group-hover:shadow-sm relative">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <div className="absolute top-3 right-3 size-7 rounded-full bg-card border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transform translate-y-1 group-hover:translate-y-0 transition-all duration-300">
          <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-medium line-clamp-1 group-hover:text-primary transition-colors duration-300">{project.name}</CardTitle>
            <Badge variant={getEnvironmentVariant(project.environment)} className="transition-all duration-300">
              {project.environment}
            </Badge>
          </div>
          <CardDescription className="line-clamp-2 mt-1.5 text-sm">
            {project.description || 'No description provided'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-3 pb-2">
          <div className="flex items-center text-sm text-muted-foreground">
            <Globe className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
            <span className="truncate">{project.url}</span>
          </div>
          
          <div className="flex items-center text-sm text-muted-foreground">
            <Calendar className="mr-2 h-4 w-4 flex-shrink-0 text-muted-foreground/70" />
            <span>
              Updated {formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true })}
            </span>
          </div>
        </CardContent>
        
        <CardFooter className="pt-2 border-t bg-muted/30">
          <div className="flex gap-2 items-center">
            <Tag className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">
              {project.testCases?.length || 0} test cases
            </span>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}

function getEnvironmentVariant(environment: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (environment.toLowerCase()) {
    case 'production':
      return 'destructive';
    case 'staging':
      return 'secondary';
    case 'development':
      return 'default';
    default:
      return 'outline';
  }
} 