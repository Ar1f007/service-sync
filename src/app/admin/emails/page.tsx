import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";
import prismaInstance from "@/lib/db";
import { processEmailQueue } from "@/lib/email";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Mail, RefreshCw, CheckCircle, XCircle, Clock } from "lucide-react";

export default async function EmailsPage() {
  const session = await getSession();
  
  if (!session || session.user.role !== "admin") {
    return redirect("/sign-in");
  }

  const emails = await prismaInstance.emailQueue.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const stats = await prismaInstance.emailQueue.groupBy({
    by: ["status"],
    _count: { status: true },
  });

  const processEmails = async () => {
    "use server";
    await processEmailQueue();
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Email Management</h1>
            <p className="text-slate-600">Manage email queue and notifications</p>
          </div>
          <form action={processEmails}>
            <Button type="submit" className="bg-teal-700 hover:bg-teal-800">
              <RefreshCw className="w-4 h-4 mr-2" />
              Process Queue
            </Button>
          </form>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {stats.map((stat) => (
            <Card key={stat.status}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">
                  {stat.status === "pending" && "Pending"}
                  {stat.status === "sent" && "Sent"}
                  {stat.status === "failed" && "Failed"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat._count.status}</div>
                <div className="flex items-center">
                  {stat.status === "pending" && <Clock className="w-4 h-4 text-yellow-500 mr-1" />}
                  {stat.status === "sent" && <CheckCircle className="w-4 h-4 text-green-500 mr-1" />}
                  {stat.status === "failed" && <XCircle className="w-4 h-4 text-red-500 mr-1" />}
                  <span className="text-sm text-slate-600">
                    {stat.status === "pending" && "Waiting to send"}
                    {stat.status === "sent" && "Successfully sent"}
                    {stat.status === "failed" && "Failed to send"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Email Queue Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Mail className="w-5 h-5 mr-2" />
              Email Queue
            </CardTitle>
            <CardDescription>
              Recent email notifications and their status
            </CardDescription>
          </CardHeader>
          <CardContent>
            {emails.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>To</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {emails.map((email) => (
                    <TableRow key={email.id}>
                      <TableCell className="font-medium">{email.to}</TableCell>
                      <TableCell>{email.subject}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{email.template}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={
                            email.status === "sent"
                              ? "bg-green-100 text-green-800"
                              : email.status === "pending"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                          }
                        >
                          {email.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{email.attempts}</TableCell>
                      <TableCell>
                        {new Date(email.createdAt).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8">
                <Mail className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">No emails in queue</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
