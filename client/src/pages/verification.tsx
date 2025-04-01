import { useQuery } from "@tanstack/react-query";
import VerificationSettings from "@/components/verification/verification-settings";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UserCheck, Search } from "lucide-react";
import { useState } from "react";
import { RobloxVerification } from "@shared/schema";

export default function Verification() {
  const [searchQuery, setSearchQuery] = useState("");
  
  const { data: verifications, isLoading } = useQuery<RobloxVerification[]>({
    queryKey: ['/api/verification/list'],
  });
  
  const filteredVerifications = verifications?.filter(
    (v) => 
      v.robloxUsername.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.discordUserId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6">Roblox Verification</h1>
      
      {/* Verification settings */}
      <VerificationSettings />
      
      {/* Verified users list */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <UserCheck className="mr-2 h-5 w-5 text-primary" />
            Verified Users
          </CardTitle>
          <CardDescription>Discord users linked to Roblox accounts</CardDescription>
          
          <div className="relative mt-2">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by Discord ID or Roblox username"
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex space-x-2">
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-40" />
                  <Skeleton className="h-6 w-32" />
                </div>
              ))}
            </div>
          ) : (
            filteredVerifications && filteredVerifications.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Discord User</TableHead>
                    <TableHead>Roblox Username</TableHead>
                    <TableHead>Verified On</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredVerifications.map((verification) => (
                    <TableRow key={verification.id}>
                      <TableCell>{verification.discordUserId}</TableCell>
                      <TableCell>{verification.robloxUsername}</TableCell>
                      <TableCell>{new Date(verification.verifiedAt).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">View</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery ? (
                  <p>No users found matching "{searchQuery}"</p>
                ) : (
                  <>
                    <UserCheck className="mx-auto h-12 w-12 mb-2 opacity-20" />
                    <p>No verified users found</p>
                  </>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  );
}
