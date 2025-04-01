import { useQuery } from "@tanstack/react-query";
import { CommandCategory } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";

export default function CommandDocumentation() {
  const { data: commandCategories, isLoading } = useQuery<CommandCategory[]>({
    queryKey: ['/api/dashboard/commands'],
  });

  if (isLoading) {
    return (
      <div className="mt-6 bg-card rounded-lg shadow">
        <div className="border-b border-border p-4">
          <h2 className="font-bold text-lg">Command Reference</h2>
          <p className="text-muted-foreground text-sm">How to use the bot's features</p>
        </div>
        
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-background p-4 rounded-md">
                <Skeleton className="h-6 w-36 mb-4" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, j) => (
                    <div key={j}>
                      <Skeleton className="h-10 w-full mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 bg-card rounded-lg shadow">
      <div className="border-b border-border p-4">
        <h2 className="font-bold text-lg">Command Reference</h2>
        <p className="text-muted-foreground text-sm">How to use the bot's features</p>
      </div>
      
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {commandCategories && commandCategories.map((category) => (
            <div key={category.name} className="bg-background p-4 rounded-md">
              <h3 className={`text-[${category.color}] font-medium text-lg mb-2`}>{category.name}</h3>
              
              <div className="space-y-3">
                {category.commands.map((command) => (
                  <div key={command.command}>
                    <div className="font-mono bg-muted p-2 rounded-md text-sm">{command.command}</div>
                    <p className="text-muted-foreground text-sm mt-1">{command.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
