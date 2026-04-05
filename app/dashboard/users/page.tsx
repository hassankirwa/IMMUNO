"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  Shield,
  UserCog,
  Syringe,
  Eye,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { facilities } from "@/lib/mock-data";

const roleColors = {
  admin: "bg-chart-5/10 text-chart-5 border-chart-5/20",
  vaccine_administrator: "bg-accent/10 text-accent border-accent/20",
  practitioner: "bg-primary/10 text-primary border-primary/20",
};

const roleIcons = {
  admin: Shield,
  vaccine_administrator: Syringe,
  practitioner: UserCog,
};

const mockUsers = [
  {
    id: "USR001",
    name: "Dr. Sarah Johnson",
    email: "sarah.johnson@immunitrack.com",
    role: "admin" as const,
    facility: "Central Medical Center",
    status: "active",
    lastActive: "2026-03-21",
  },
  {
    id: "USR002",
    name: "Dr. Michael Chen",
    email: "michael.chen@immunitrack.com",
    role: "vaccine_administrator" as const,
    facility: "Community Health Clinic",
    status: "active",
    lastActive: "2026-03-21",
  },
  {
    id: "USR003",
    name: "Nurse Emily Davis",
    email: "emily.davis@immunitrack.com",
    role: "vaccine_administrator" as const,
    facility: "Pediatric Care Center",
    status: "active",
    lastActive: "2026-03-20",
  },
  {
    id: "USR004",
    name: "Dr. James Wilson",
    email: "james.wilson@immunitrack.com",
    role: "practitioner" as const,
    facility: "Central Medical Center",
    status: "inactive",
    lastActive: "2026-03-15",
  },
  {
    id: "USR005",
    name: "Nurse Maria Garcia",
    email: "maria.garcia@immunitrack.com",
    role: "vaccine_administrator" as const,
    facility: "Community Health Clinic",
    status: "active",
    lastActive: "2026-03-21",
  },
];

const permissions = {
  admin: [
    { name: "View All Vaccinations", enabled: true },
    { name: "Manage Users", enabled: true },
    { name: "Manage Facilities", enabled: true },
    { name: "View Reports", enabled: true },
    { name: "Send Notifications", enabled: true },
    { name: "Edit System Settings", enabled: true },
    { name: "Delete Records", enabled: true },
  ],
  vaccine_administrator: [
    { name: "View Assigned Patients", enabled: true },
    { name: "Record Vaccinations", enabled: true },
    { name: "Schedule Follow-ups", enabled: true },
    { name: "Send Patient Reminders", enabled: true },
    { name: "View Own Reports", enabled: true },
    { name: "Manage Users", enabled: false },
    { name: "Delete Records", enabled: false },
  ],
  practitioner: [
    { name: "View Assigned Patients", enabled: true },
    { name: "View Vaccination History", enabled: true },
    { name: "Record Vaccinations", enabled: false },
    { name: "Send Notifications", enabled: false },
    { name: "Manage Users", enabled: false },
    { name: "Delete Records", enabled: false },
  ],
};

export default function UsersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<keyof typeof permissions>("admin");

  const filteredUsers = mockUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight lg:text-3xl">
            Users & Roles
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage user access and role-based permissions
          </p>
        </div>
        <Dialog open={isAddUserOpen} onOpenChange={setIsAddUserOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Add New User</DialogTitle>
              <DialogDescription>
                Create a new user account and assign permissions
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first-name">First Name</Label>
                  <Input id="first-name" placeholder="John" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="last-name">Last Name</Label>
                  <Input id="last-name" placeholder="Doe" />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="john.doe@immunitrack.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select defaultValue="vaccine_administrator">
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Admin
                      </div>
                    </SelectItem>
                    <SelectItem value="vaccine_administrator">
                      <div className="flex items-center gap-2">
                        <Syringe className="h-4 w-4" />
                        Vaccine Administrator
                      </div>
                    </SelectItem>
                    <SelectItem value="practitioner">
                      <div className="flex items-center gap-2">
                        <UserCog className="h-4 w-4" />
                        Healthcare Practitioner
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="facility">Assigned Facility</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select facility" />
                  </SelectTrigger>
                  <SelectContent>
                    {facilities.map((facility) => (
                      <SelectItem key={facility.id} value={facility.id}>
                        {facility.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddUserOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsAddUserOpen(false)}>
                Create User
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Role Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {(Object.keys(roleColors) as Array<keyof typeof roleColors>).map((role) => {
          const RoleIcon = roleIcons[role];
          const userCount = mockUsers.filter((u) => u.role === role).length;
          return (
            <Card
              key={role}
              className="border-border/50 shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => setSelectedRole(role)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className={`rounded-xl p-3 ${roleColors[role].split(" ")[0]}`}>
                    <RoleIcon className={`h-6 w-6 ${roleColors[role].split(" ")[1]}`} />
                  </div>
                  <div>
                    <p className="font-semibold capitalize">
                      {role.replace("_", " ")}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {userCount} user{userCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Users Table */}
        <Card className="border-border/50 shadow-sm lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg font-semibold">
                All Users ({filteredUsers.length})
              </CardTitle>
              <div className="flex gap-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search users..."
                    className="pl-9 w-[200px]"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="All Roles" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="vaccine_administrator">
                      Vaccine Admin
                    </SelectItem>
                    <SelectItem value="practitioner">Practitioner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">
                      Facility
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => {
                    const RoleIcon = roleIcons[user.role];
                    return (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                                {user.name
                                  .split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{user.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={roleColors[user.role]}
                          >
                            <RoleIcon className="mr-1 h-3 w-3" />
                            {user.role.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {user.facility}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              user.status === "active"
                                ? "bg-success/10 text-success border-success/20"
                                : "bg-muted text-muted-foreground"
                            }
                          >
                            {user.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit User
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Deactivate
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Role Permissions */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold capitalize flex items-center gap-2">
              {(() => {
                const RoleIcon = roleIcons[selectedRole];
                return <RoleIcon className="h-5 w-5" />;
              })()}
              {selectedRole.replace("_", " ")} Permissions
            </CardTitle>
            <CardDescription>
              Configure what this role can access
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {permissions[selectedRole].map((permission, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 rounded-lg bg-secondary/30"
                >
                  <div className="flex items-center gap-3">
                    {permission.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm">{permission.name}</span>
                  </div>
                  <Switch
                    checked={permission.enabled}
                    disabled={selectedRole !== "admin"}
                  />
                </div>
              ))}
            </div>
            {selectedRole !== "admin" && (
              <p className="text-xs text-muted-foreground mt-4">
                Only admins can modify role permissions
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
