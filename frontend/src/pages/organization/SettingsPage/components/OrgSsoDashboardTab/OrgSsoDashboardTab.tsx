import { useMemo, useState } from "react";
import {
  CircleCheck,
  Clock,
  Eye,
  Globe,
  Info,
  MoreHorizontal,
  Plus,
  Search,
  ShieldCheck,
  Trash2
} from "lucide-react";

import {
  Badge,
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  IconButton,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from "@app/components/v3";
import { OrgPermissionSsoActions, OrgPermissionSubjects } from "@app/context";
import { withPermission } from "@app/hoc";

// Static mock data — design iteration sandbox.
const provider = {
  name: "Okta",
  initial: "O",
  protocol: "SAML",
  status: "Healthy",
  meta: "Connected · last sign-in 3 min ago · 47 successful sign-ins this week",
  issuer: "http://www.okta.com/abc",
  certExpires: "Jan 12, 2027"
};

type DomainStatus = "Pending" | "Verified";

const emailDomains: {
  domain: string;
  status: DomainStatus;
  verifiedAt: string | null;
  expiresAt: string;
}[] = [
  {
    domain: "flexboxandchill.dev",
    status: "Pending",
    verifiedAt: null,
    expiresAt: "May 8, 2026"
  },
  {
    domain: "acme.com",
    status: "Verified",
    verifiedAt: "Jan 4, 2026",
    expiresAt: "Jan 4, 2027"
  }
];

export const OrgSsoDashboardTab = withPermission(
  () => {
    const [requireSso, setRequireSso] = useState(true);
    const [adminBypass, setAdminBypass] = useState(true);
    const [enableSaml, setEnableSaml] = useState(true);
    const [samlGroupMapping, setSamlGroupMapping] = useState(false);
    const [domainSearch, setDomainSearch] = useState("");

    const filteredDomains = useMemo(() => {
      const q = domainSearch.trim().toLowerCase();
      if (!q) return emailDomains;
      return emailDomains.filter((d) => d.domain.toLowerCase().includes(q));
    }, [domainSearch]);

    return (
      <div className="flex flex-col gap-6">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="flex flex-col gap-4 lg:col-span-2">
            <section className="flex flex-col gap-2">
              <ItemGroup>
                <Item variant="outline" className="flex-col items-stretch gap-3 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <ItemContent>
                      <ItemTitle className="gap-2">
                        <span className="text-base">{provider.name} Configured</span>
                        <Badge variant="neutral">{provider.protocol}</Badge>
                      </ItemTitle>
                      <ItemDescription>{provider.meta}</ItemDescription>
                    </ItemContent>
                    <ItemActions>
                      <Button variant="outline" size="sm">
                        Manage
                      </Button>
                      <IconButton variant="ghost" size="sm" aria-label="More actions">
                        <MoreHorizontal />
                      </IconButton>
                    </ItemActions>
                  </div>
                  <div className="flex flex-col gap-4 border-t border-border pt-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-sm font-medium text-foreground">Enable SAML</span>
                        <span className="text-xs text-accent">
                          Allow members to authenticate into Infisical with SAML.
                        </span>
                      </div>
                      <Switch
                        variant="org"
                        checked={enableSaml}
                        onCheckedChange={setEnableSaml}
                        aria-label="Enable SAML"
                      />
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                          SAML Group Membership Mapping
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="size-3.5 text-muted" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Group memberships sync from the SAML assertion on each sign-in.
                            </TooltipContent>
                          </Tooltip>
                        </span>
                        <span className="text-xs text-accent">
                          Infisical will manage user group memberships based on the SAML provider.
                        </span>
                      </div>
                      <Switch
                        variant="org"
                        checked={samlGroupMapping}
                        onCheckedChange={setSamlGroupMapping}
                        aria-label="SAML Group Membership Mapping"
                      />
                    </div>
                  </div>
                </Item>
              </ItemGroup>
            </section>

            <Card className="border-0 shadow-none">
              <CardHeader>
                <CardTitle>
                  <Globe className="size-4 text-accent" />
                  Email domains
                </CardTitle>
                <CardDescription>Verified domains route to your IDP.</CardDescription>
                <CardAction>
                  <Button variant="org" size="sm">
                    <Plus />
                    Add domain
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <InputGroup>
                  <InputGroupAddon>
                    <Search />
                  </InputGroupAddon>
                  <InputGroupInput
                    placeholder="Search domains"
                    value={domainSearch}
                    onChange={(e) => setDomainSearch(e.target.value)}
                  />
                </InputGroup>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Domain</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verified at</TableHead>
                      <TableHead>Expires at</TableHead>
                      <TableHead className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDomains.map((d) => (
                      <TableRow key={d.domain}>
                        <TableCell className="font-medium text-foreground">{d.domain}</TableCell>
                        <TableCell>
                          {d.status === "Verified" ? (
                            <Badge variant="success">
                              <CircleCheck />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="warning">
                              <Clock />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-accent">{d.verifiedAt ?? "-"}</TableCell>
                        <TableCell>{d.expiresAt}</TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <IconButton
                                variant="ghost"
                                size="sm"
                                aria-label={`Actions for ${d.domain}`}
                              >
                                <MoreHorizontal />
                              </IconButton>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                              <DropdownMenuItem>
                                <Eye />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem variant="danger">
                                <Trash2 />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  <ShieldCheck className="size-4 text-accent" />
                  Enforcement
                  <Badge variant="success">Active</Badge>
                </CardTitle>
                <CardDescription>Require all members to sign in via your IDP.</CardDescription>
              </CardHeader>
              <div className="flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">Require SSO</span>
                    <span className="text-xs text-accent">
                      Password and Google OAuth sign-ins will be disabled.
                    </span>
                  </div>
                  <Switch
                    variant="org"
                    checked={requireSso}
                    onCheckedChange={setRequireSso}
                    aria-label="Require SSO"
                  />
                </div>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium text-foreground">Admin bypass</span>
                    <span className="text-xs text-accent">
                      Admins can sign in via password if your IDP is down.
                    </span>
                  </div>
                  <Switch
                    variant="org"
                    checked={adminBypass}
                    onCheckedChange={setAdminBypass}
                    aria-label="Admin bypass"
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  },
  { action: OrgPermissionSsoActions.Read, subject: OrgPermissionSubjects.Sso }
);
