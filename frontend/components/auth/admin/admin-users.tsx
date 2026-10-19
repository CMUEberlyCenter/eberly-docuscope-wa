import {
  DEFAULT_TABLE_SEARCH_DEBOUNCE_MS,
  fieldsWithModelValues,
  getAdditionalFieldDefaultValues,
  getAdditionalFieldSubmitValues,
  getClampedTablePageIndex
} from "@better-auth-ui/core"
import {
  type AdminAuthClient,
  type AdminListUsersParams,
  type AdminUser,
  banAdminUserOptions,
  createAdminUserOptions,
  impersonateAdminUserOptions,
  isAdminTarget,
  removeAdminUserOptions,
  revokeAdminUserSessionOptions,
  revokeAdminUserSessionsOptions,
  setAdminUserPasswordOptions,
  setAdminUserRoleOptions,
  unbanAdminUserOptions,
  updateAdminUserOptions
} from "@better-auth-ui/core/plugins/admin"
import {
  useAuth,
  useAuthPlugin,
  useCopyToClipboard,
  useSession
} from "@better-auth-ui/react"
import {
  useAdminPermission,
  useAdminUser,
  useAdminUserSessions,
  useAdminUsers
} from "@better-auth-ui/react/plugins/admin"
import { useDebouncedValue } from "@tanstack/react-pacer"
import { keepPreviousData, useMutation } from "@tanstack/react-query"
import type { SortingState } from "@tanstack/react-table"
import type { BetterFetchError } from "better-auth/react"
import {
  BanIcon,
  CheckIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CopyIcon,
  EllipsisIcon,
  KeyRoundIcon,
  LogInIcon,
  Monitor,
  SearchIcon,
  ShieldAlertIcon,
  Trash2Icon,
  UserPlusIcon,
  UserRound
} from "lucide-react"
import { type FormEvent, useEffect, useMemo, useState } from "react"
import { UserAvatar } from "#components/auth/user/user-avatar.tsx"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "#components/ui/alert-dialog.tsx"
import { Badge } from "#components/ui/badge.tsx"
import { Button } from "#components/ui/button.tsx"
import { Checkbox } from "#components/ui/checkbox.tsx"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "#components/ui/dialog.tsx"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "#components/ui/dropdown-menu.tsx"
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet
} from "#components/ui/field.tsx"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput
} from "#components/ui/input-group.tsx"
import { RadioGroup, RadioGroupItem } from "#components/ui/radio-group.tsx"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "#components/ui/select.tsx"
import { Separator } from "#components/ui/separator.tsx"
import { Skeleton } from "#components/ui/skeleton.tsx"
import { Switch } from "#components/ui/switch.tsx"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "#components/ui/table.tsx"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#components/ui/tabs.tsx"
import { adminPlugin } from "#lib/auth/admin-plugin.ts"
import { getAuthAdditionalFieldValidators, useAuthForm } from "../auth-form"
import { useServerTableState } from "../server-table-state"

import { createAdminColumnHelper, useAdminTable } from "./admin-table"

type SearchField = "email" | "name"
type SearchOperator = "contains" | "ends_with" | "starts_with"
type StatusFilter = "all" | "active" | "banned"
type DangerousAction = "ban" | "delete" | "impersonate" | "revokeAll"

export type AdminUsersProps = {
  className?: string
  onSelectedUserIdChange?: (userId: string | undefined) => void
  selectedUserId?: string
}

const formatDate = (value: Date | string | undefined | null) =>
  value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(
        new Date(value)
      )
    : "–"

const asAdminRoles = (roles: string[]) => roles as ("user" | "admin")[]

const parseAdminRoles = (
  role: string | undefined,
  fallback: string,
  allowMultipleRoles: boolean
) => {
  const roles = role
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean)
  const resolved = roles?.length ? roles : [fallback]
  return allowMultipleRoles ? resolved : resolved.slice(0, 1)
}

const getBanDurationSeconds = (value: string) => {
  if (!value) return undefined
  const days = Number(value)
  if (!Number.isSafeInteger(days) || days <= 0) return null
  const seconds = days * 86_400
  return Number.isSafeInteger(seconds) ? seconds : null
}

const getAdminErrorMessage = (error: Error | null) => {
  const authError = error as BetterFetchError | null
  return authError?.error?.message ?? authError?.message
}

const adminColumnHelper = createAdminColumnHelper<AdminUser>()
const adminColumns = adminColumnHelper.columns([
  adminColumnHelper.accessor("name", { id: "name" }),
  adminColumnHelper.accessor("role", {
    id: "role",
    enableSorting: false
  }),
  adminColumnHelper.accessor("banned", {
    id: "status",
    enableSorting: false
  }),
  adminColumnHelper.accessor((user) => new Date(user.createdAt).getTime(), {
    id: "createdAt"
  })
])
const EMPTY_USERS: AdminUser[] = []
const INITIAL_ADMIN_SORTING: SortingState = [{ id: "createdAt", desc: true }]

/** Server-paginated user management with optional controlled inspector state. */
export function AdminUsers({
  className,
  onSelectedUserIdChange,
  selectedUserId: controlledSelectedUserId
}: AdminUsersProps) {
  const auth = useAuth<AdminAuthClient>()
  const config = useAuthPlugin(adminPlugin)
  const { localization } = config
  const [localSelectedUserId, setLocalSelectedUserId] = useState<string>()
  const tableState = useServerTableState({
    initialSorting: INITIAL_ADMIN_SORTING,
    pageSize: config.pageSize
  })
  const { columnFilters, globalFilter, pagination, setPagination, sorting } =
    tableState
  const [searchField, setSearchField] = useState<SearchField>("email")
  const [searchOperator, setSearchOperator] =
    useState<SearchOperator>("contains")
  const [createOpen, setCreateOpen] = useState(false)
  const [debouncedSearch] = useDebouncedValue(globalFilter.trim(), {
    wait: DEFAULT_TABLE_SEARCH_DEBOUNCE_MS
  })
  const status = String(
    columnFilters.find((filter) => filter.id === "status")?.value ?? "all"
  ) as StatusFilter
  const searchFieldItems = [
    { label: localization.email, value: "email" },
    { label: localization.name, value: "name" }
  ]
  const searchOperatorItems = [
    { label: localization.searchContains, value: "contains" },
    { label: localization.startsWith, value: "starts_with" },
    { label: localization.endsWith, value: "ends_with" }
  ]
  const statusItems = [
    { label: localization.filterAllStatuses, value: "all" },
    { label: localization.active, value: "active" },
    { label: localization.banned, value: "banned" }
  ]
  const primarySort = sorting[0]
  const sortBy = primarySort?.id === "name" ? "name" : "createdAt"
  const sortDirection = primarySort?.desc ? "desc" : "asc"
  const isSelectionControlled = onSelectedUserIdChange !== undefined
  const selectedUserId = isSelectionControlled
    ? controlledSelectedUserId
    : localSelectedUserId

  const setSelectedUserId = (userId: string | undefined) => {
    if (!isSelectionControlled) setLocalSelectedUserId(userId)
    onSelectedUserIdChange?.(userId)
  }

  const params = useMemo<AdminListUsersParams>(
    () => ({
      limit: pagination.pageSize,
      offset: pagination.pageIndex * pagination.pageSize,
      searchField,
      searchOperator,
      searchValue: debouncedSearch || undefined,
      sortBy,
      sortDirection,
      ...(status === "all"
        ? {}
        : {
            filterField: "banned",
            filterOperator: "eq" as const,
            filterValue: status === "banned"
          })
    }),
    [
      debouncedSearch,
      pagination.pageIndex,
      pagination.pageSize,
      searchField,
      searchOperator,
      sortBy,
      sortDirection,
      status
    ]
  )
  const permission = useAdminPermission(auth.authClient, { user: ["list"] })
  const users = useAdminUsers(auth.authClient, {
    enabled: permission.data?.success === true,
    params,
    placeholderData: keepPreviousData
  })
  const canCreate = useAdminPermission(auth.authClient, { user: ["create"] })
  const canGet = useAdminPermission(auth.authClient, { user: ["get"] })

  const total = users.data?.total ?? 0

  useEffect(() => {
    if (!users.isSuccess) return
    const pageIndex = getClampedTablePageIndex(
      pagination.pageIndex,
      pagination.pageSize,
      total
    )
    if (pageIndex !== pagination.pageIndex) {
      setPagination((current) => ({ ...current, pageIndex }))
    }
  }, [
    pagination.pageIndex,
    pagination.pageSize,
    setPagination,
    total,
    users.isSuccess
  ])
  const table = useAdminTable(
    {
      atoms: tableState.atoms,
      columns: adminColumns,
      data: users.data?.users ?? EMPTY_USERS,
      getRowId: (user) => user.id,
      manualFiltering: true,
      manualPagination: true,
      manualSorting: true,
      rowCount: total
    },
    () => null
  )
  const from = total ? pagination.pageIndex * pagination.pageSize + 1 : 0
  const to = Math.min(total, (pagination.pageIndex + 1) * pagination.pageSize)

  return (
    <section className={className}>
      <div className="tw:flex tw:flex-col tw:gap-4">
        <div className="tw:flex tw:flex-col tw:gap-3 tw:sm:flex-row tw:sm:items-end tw:sm:justify-between">
          <div className="tw:flex tw:flex-col tw:gap-1">
            <h1 className="tw:text-xl tw:font-semibold tw:tracking-tight">
              {localization.users}
            </h1>
            <p className="tw:text-sm tw:text-muted-foreground">
              {localization.usersDescription}
            </p>
          </div>
          {canCreate.isPending ? (
            <Skeleton className="tw:h-8 tw:w-28" />
          ) : canCreate.data?.success ? (
            <Button onClick={() => setCreateOpen(true)}>
              <UserPlusIcon />
              {localization.createUser}
            </Button>
          ) : null}
        </div>

        <div className="tw:grid tw:gap-2 tw:sm:grid-cols-2 tw:lg:grid-cols-[9rem_10rem_minmax(14rem,1fr)_10rem]">
          <Select
            items={searchFieldItems}
            value={searchField}
            onValueChange={(value) => {
              if (!value) return
              setSearchField(value as SearchField)
              table.setPageIndex(0)
            }}
          >
            <SelectTrigger
              aria-label={localization.search}
              className="tw:w-full tw:sm:w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {searchFieldItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <Select
            items={searchOperatorItems}
            value={searchOperator}
            onValueChange={(value) => {
              if (!value) return
              setSearchOperator(value as SearchOperator)
              table.setPageIndex(0)
            }}
          >
            <SelectTrigger aria-label={localization.searchOperator}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {searchOperatorItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <InputGroup>
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              aria-label={
                searchField === "email"
                  ? localization.searchByEmail
                  : localization.searchByName
              }
              onChange={(event) => {
                table.setGlobalFilter(event.target.value)
              }}
              placeholder={
                searchField === "email"
                  ? localization.searchByEmail
                  : localization.searchByName
              }
              value={globalFilter}
            />
          </InputGroup>
          <Select
            items={statusItems}
            value={status}
            onValueChange={(value) => {
              if (!value) return
              table
                .getColumn("status")
                ?.setFilterValue(value === "all" ? undefined : value)
            }}
          >
            <SelectTrigger
              aria-label={localization.status}
              className="tw:w-full tw:sm:w-36"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                {statusItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        </div>

        {permission.isPending ? (
          <UserTableSkeleton />
        ) : !permission.data?.success ? (
          <AdminState
            icon={<ShieldAlertIcon />}
            title={localization.accessDenied}
            description={localization.accessDeniedDescription}
          />
        ) : users.isError ? (
          <AdminState
            icon={<ShieldAlertIcon />}
            title={localization.loadUsersError}
            description={localization.loadUsersErrorDescription}
            action={
              <Button variant="outline" onClick={() => users.refetch()}>
                {localization.retry}
              </Button>
            }
          />
        ) : (
          <div className="tw:overflow-hidden tw:rounded-lg tw:border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <SortButton
                      onClick={table
                        .getColumn("name")
                        ?.getToggleSortingHandler()}
                      sorted={table.getColumn("name")?.getIsSorted() ?? false}
                    >
                      {localization.name}
                    </SortButton>
                  </TableHead>
                  <TableHead className="tw:hidden tw:md:table-cell">
                    {localization.role}
                  </TableHead>
                  <TableHead>{localization.status}</TableHead>
                  <TableHead className="tw:hidden tw:lg:table-cell">
                    <SortButton
                      onClick={table
                        .getColumn("createdAt")
                        ?.getToggleSortingHandler()}
                      sorted={
                        table.getColumn("createdAt")?.getIsSorted() ?? false
                      }
                    >
                      {localization.created}
                    </SortButton>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.isPending ? (
                  <UserRowsSkeleton />
                ) : table.getRowModel().rows.length ? (
                  table.getRowModel().rows.map((row) => {
                    const user = row.original
                    return (
                      <TableRow
                        key={row.id}
                        aria-selected={selectedUserId === user.id}
                        className={
                          canGet.data?.success ? "cursor-pointer" : undefined
                        }
                        onClick={
                          canGet.data?.success
                            ? () => setSelectedUserId(user.id)
                            : undefined
                        }
                      >
                        <TableCell>
                          <div className="tw:flex tw:items-center tw:gap-3">
                            <UserAvatar className="tw:size-8" user={user} />
                            <div className="tw:min-w-0">
                              {canGet.data?.success ? (
                                <Button
                                  className="tw:h-auto tw:min-w-0 tw:justify-start tw:p-0 tw:font-medium"
                                  onClick={(event) => {
                                    event.stopPropagation()
                                    setSelectedUserId(user.id)
                                  }}
                                  variant="link"
                                >
                                  <span className="tw:truncate">{user.name}</span>
                                </Button>
                              ) : (
                                <span className="tw:truncate">{user.name}</span>
                              )}
                              <div className="tw:truncate tw:text-xs tw:text-muted-foreground">
                                {user.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="tw:hidden tw:md:table-cell">
                          <Badge variant="outline">
                            {user.role ?? config.defaultRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={user.banned ? "destructive" : "secondary"}
                          >
                            {user.banned
                              ? localization.banned
                              : localization.active}
                          </Badge>
                        </TableCell>
                        <TableCell className="tw:hidden tw:text-muted-foreground tw:lg:table-cell">
                          {formatDate(user.createdAt)}
                        </TableCell>
                      </TableRow>
                    )
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="tw:h-40 tw:text-center">
                      <strong className="tw:block tw:font-medium">
                        {localization.noUsers}
                      </strong>
                      <span className="tw:text-muted-foreground">
                        {localization.noUsersDescription}
                      </span>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        <div className="tw:flex tw:items-center tw:justify-between tw:gap-3 tw:text-sm tw:text-muted-foreground">
          <span>
            {localization.usersPaginationRange
              .replace("{{from}}", String(from))
              .replace("{{to}}", String(to))
              .replace("{{total}}", String(total))}
          </span>
          <div className="tw:flex tw:gap-1">
            <Button
              aria-label={localization.previousPage}
              disabled={!table.getCanPreviousPage() || users.isFetching}
              onClick={() => table.previousPage()}
              size="icon-sm"
              variant="outline"
            >
              <ChevronLeftIcon />
            </Button>
            <Button
              aria-label={localization.nextPage}
              disabled={!table.getCanNextPage() || users.isFetching}
              onClick={() => table.nextPage()}
              size="icon-sm"
              variant="outline"
            >
              <ChevronRightIcon />
            </Button>
          </div>
        </div>
      </div>

      <CreateUserDialog open={createOpen} onOpenChange={setCreateOpen} />
      <UserInspector
        canGetUser={canGet.data?.success === true}
        open={Boolean(selectedUserId) && canGet.data?.success === true}
        onOpenChange={(open) => !open && setSelectedUserId(undefined)}
        userId={selectedUserId}
      />
    </section>
  )
}

function SortButton({
  children,
  onClick,
  sorted
}: {
  children: React.ReactNode
  onClick?: (event: unknown) => void
  sorted: false | "asc" | "desc"
}) {
  return (
    <button
      className="tw:inline-flex tw:items-center tw:gap-1 tw:hover:text-foreground"
      onClick={onClick}
      type="button"
    >
      {children}
      {sorted ? (sorted === "asc" ? "↑" : "↓") : null}
    </button>
  )
}

function AdminState({
  action,
  description,
  icon,
  title
}: {
  action?: React.ReactNode
  description: string
  icon: React.ReactNode
  title: string
}) {
  return (
    <div className="tw:flex tw:min-h-64 tw:flex-col tw:items-center tw:justify-center tw:gap-3 tw:rounded-lg tw:border tw:border-dashed tw:p-8 tw:text-center">
      <span className="tw:text-muted-foreground tw:[&>svg]:size-8">{icon}</span>
      <div className="tw:flex tw:flex-col tw:gap-1">
        <h2 className="tw:font-medium">{title}</h2>
        <p className="tw:max-w-md tw:text-sm tw:text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  )
}

const skeletonRowIds = [
  "admin-row-1",
  "admin-row-2",
  "admin-row-3",
  "admin-row-4",
  "admin-row-5"
]

function UserRowsSkeleton() {
  return skeletonRowIds.map((id) => (
    <TableRow key={id}>
      <TableCell>
        <div className="tw:flex tw:items-center tw:gap-3">
          <Skeleton className="tw:size-8 tw:rounded-full" />
          <div className="tw:flex tw:flex-col tw:gap-1">
            <Skeleton className="tw:h-4 tw:w-32" />
            <Skeleton className="tw:h-3 tw:w-48" />
          </div>
        </div>
      </TableCell>
      <TableCell className="tw:hidden tw:md:table-cell">
        <Skeleton className="tw:h-5 tw:w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="tw:h-5 tw:w-16" />
      </TableCell>
      <TableCell className="tw:hidden tw:lg:table-cell">
        <Skeleton className="tw:h-4 tw:w-24" />
      </TableCell>
    </TableRow>
  ))
}

function UserTableSkeleton() {
  return (
    <div className="tw:overflow-hidden tw:rounded-lg tw:border">
      <Table>
        <TableBody>
          <UserRowsSkeleton />
        </TableBody>
      </Table>
    </div>
  )
}

function CreateUserDialog({
  open,
  onOpenChange
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const auth = useAuth<AdminAuthClient>()
  const config = useAuthPlugin(adminPlugin)
  const { data: session } = useSession(auth.authClient)
  const createUser = useMutation(
    createAdminUserOptions(auth.authClient, session?.user.id)
  )
  const canSetRole = useAdminPermission(auth.authClient, {
    user: ["set-role"]
  })
  const additionalFields = auth.additionalFields ?? []
  const form = useAuthForm({
    defaultValues: {
      additionalFields: getAdditionalFieldDefaultValues(additionalFields),
      email: "",
      emailVerified: false,
      name: "",
      password: "",
      roles: [config.defaultRole]
    },
    onSubmit: async ({ value }) => {
      try {
        await createUser.mutateAsync(
          {
            data: {
              ...getAdditionalFieldSubmitValues(
                additionalFields,
                value.additionalFields
              ),
              emailVerified: value.emailVerified
            },
            email: value.email,
            name: value.name,
            password: value.password,
            ...(canSetRole.data?.success
              ? { role: asAdminRoles(value.roles) }
              : {})
          },
          { onSuccess: close }
        )
      } catch {
        // The mutation reports the error through its configured handler.
      }
    }
  })

  useEffect(() => {
    if (!config.allowMultipleRoles)
      form.setFieldValue("roles", (current) => current.slice(0, 1))
  }, [config.allowMultipleRoles, form.setFieldValue])

  const close = () => {
    form.reset()
    createUser.reset()
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => (value ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <form.AppForm>
          <form.AuthFormRoot className="tw:flex tw:flex-col tw:gap-4">
            <DialogHeader>
              <DialogTitle>{config.localization.createUser}</DialogTitle>
              <DialogDescription>
                {config.localization.usersDescription}
              </DialogDescription>
            </DialogHeader>
            <FieldGroup>
              <form.Field name="name">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="admin-create-name">
                      {config.localization.name}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        id="admin-create-name"
                        name={field.name}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        required
                        value={field.state.value}
                      />
                    </InputGroup>
                  </Field>
                )}
              </form.Field>
              <form.Field name="email">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="admin-create-email">
                      {config.localization.email}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        autoComplete="off"
                        id="admin-create-email"
                        name={field.name}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        required
                        type="email"
                        value={field.state.value}
                      />
                    </InputGroup>
                  </Field>
                )}
              </form.Field>
              <form.Field name="password">
                {(field) => (
                  <Field>
                    <FieldLabel htmlFor="admin-create-password">
                      {config.localization.password}
                    </FieldLabel>
                    <InputGroup>
                      <InputGroupInput
                        autoComplete="new-password"
                        id="admin-create-password"
                        name={field.name}
                        onChange={(event) =>
                          field.handleChange(event.target.value)
                        }
                        required
                        type="password"
                        value={field.state.value}
                      />
                    </InputGroup>
                  </Field>
                )}
              </form.Field>
              {canSetRole.isPending ? (
                <Skeleton className="tw:h-16 tw:w-full" />
              ) : canSetRole.data?.success ? (
                <FieldSet>
                  <FieldLegend variant="label">
                    {config.localization.role}
                  </FieldLegend>
                  <form.Field name="roles">
                    {(field) =>
                      config.allowMultipleRoles ? (
                        <FieldGroup data-slot="checkbox-group">
                          {config.roles.map((role) => (
                            <Field key={role} orientation="horizontal">
                              <Checkbox
                                checked={field.state.value.includes(role)}
                                id={`admin-create-role-${role}`}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...field.state.value, role]
                                    : field.state.value.filter(
                                        (item) => item !== role
                                      )
                                  if (next.length) field.handleChange(next)
                                }}
                              />
                              <FieldLabel htmlFor={`admin-create-role-${role}`}>
                                {role}
                              </FieldLabel>
                            </Field>
                          ))}
                        </FieldGroup>
                      ) : (
                        <RadioGroup
                          onValueChange={(role) => field.handleChange([role])}
                          value={field.state.value[0] ?? ""}
                        >
                          {config.roles.map((role) => (
                            <Field key={role} orientation="horizontal">
                              <RadioGroupItem
                                id={`admin-create-role-${role}`}
                                value={role}
                              />
                              <FieldLabel htmlFor={`admin-create-role-${role}`}>
                                {role}
                              </FieldLabel>
                            </Field>
                          ))}
                        </RadioGroup>
                      )
                    }
                  </form.Field>
                </FieldSet>
              ) : null}
              <form.Field name="emailVerified">
                {(field) => (
                  <Field orientation="horizontal">
                    <Switch
                      checked={field.state.value}
                      id="admin-create-email-verified"
                      onCheckedChange={field.handleChange}
                    />
                    <FieldContent>
                      <FieldLabel htmlFor="admin-create-email-verified">
                        {config.localization.emailVerified}
                      </FieldLabel>
                    </FieldContent>
                  </Field>
                )}
              </form.Field>
              {additionalFields.map((configuredField) => (
                <form.AppField
                  key={configuredField.name}
                  name={`additionalFields.${configuredField.name}`}
                  validators={getAuthAdditionalFieldValidators(
                    configuredField,
                    auth.localization.auth.fieldRequired
                  )}
                >
                  {(field) => (
                    <field.AuthFormAdditionalField
                      field={configuredField}
                      isPending={createUser.isPending}
                    />
                  )}
                </form.AppField>
              ))}
            </FieldGroup>
            <FieldError>{getAdminErrorMessage(createUser.error)}</FieldError>
            <DialogFooter>
              <Button onClick={close} type="button" variant="outline">
                {config.localization.cancel}
              </Button>
              <form.AuthFormSubmitButton disabled={createUser.isPending}>
                {config.localization.createUser}
              </form.AuthFormSubmitButton>
            </DialogFooter>
          </form.AuthFormRoot>
        </form.AppForm>
      </DialogContent>
    </Dialog>
  )
}

function UserInspector({
  canGetUser,
  open,
  onOpenChange,
  userId
}: {
  canGetUser: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
}) {
  const auth = useAuth<AdminAuthClient>()
  const config = useAuthPlugin(adminPlugin)
  const contributedTabs = auth.plugins.flatMap((plugin) =>
    (plugin.adminUserTabs ?? []).map((tab) => ({
      ...tab,
      value: `${plugin.id}:${tab.id}`
    }))
  )
  const detail = useAdminUser(auth.authClient, userId, {
    enabled: canGetUser
  })
  const user = detail.data
  const sessionsPermission = useAdminPermission(
    auth.authClient,
    {
      session: ["list"]
    },
    { enabled: Boolean(userId) }
  )
  const sessions = useAdminUserSessions(auth.authClient, userId, {
    enabled: sessionsPermission.data?.success === true
  })
  const { data: actor } = useSession(auth.authClient)
  const canSetRole = useAdminPermission(
    auth.authClient,
    {
      user: ["set-role"]
    },
    { enabled: Boolean(userId) }
  )
  const canUpdate = useAdminPermission(
    auth.authClient,
    { user: ["update"] },
    { enabled: Boolean(userId) }
  )
  const canSetEmail = useAdminPermission(
    auth.authClient,
    { user: ["set-email"] },
    { enabled: Boolean(userId) }
  )
  const canSetPassword = useAdminPermission(
    auth.authClient,
    {
      user: ["set-password"]
    },
    { enabled: Boolean(userId) }
  )
  const canBan = useAdminPermission(
    auth.authClient,
    { user: ["ban"] },
    { enabled: Boolean(userId) }
  )
  const canImpersonate = useAdminPermission(
    auth.authClient,
    {
      user: ["impersonate"]
    },
    { enabled: Boolean(userId) }
  )
  const targetIsAdmin = user
    ? isAdminTarget(user, config.adminRoles, config.adminUserIds)
    : false
  const canImpersonateAdmins = useAdminPermission(
    auth.authClient,
    { user: ["impersonate-admins"] },
    { enabled: Boolean(userId && targetIsAdmin) }
  )
  const canDelete = useAdminPermission(
    auth.authClient,
    { user: ["delete"] },
    { enabled: Boolean(userId) }
  )
  const canRevoke = useAdminPermission(
    auth.authClient,
    {
      session: ["revoke"]
    },
    { enabled: Boolean(userId) }
  )
  const {
    copied: userIdCopied,
    copy: copyUserId,
    reset: resetUserIdCopy
  } = useCopyToClipboard()

  useEffect(() => {
    if (open && userId) resetUserIdCopy()
  }, [open, userId, resetUserIdCopy])

  const [banReason, setBanReason] = useState("")
  const [banDuration, setBanDuration] = useState("")
  const banDurationSeconds = getBanDurationSeconds(banDuration)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [dangerousAction, setDangerousAction] = useState<DangerousAction>()
  const isSelf = user?.id === actor?.user.id

  const updateUser = useMutation(
    updateAdminUserOptions(auth.authClient, actor?.user.id)
  )

  useEffect(() => {
    if (user?.id) updateUser.reset()
  }, [user?.id, updateUser.reset])

  useEffect(() => {
    if (!open) updateUser.reset()
  }, [open, updateUser.reset])

  const setRoleMutation = useMutation(
    setAdminUserRoleOptions(auth.authClient, actor?.user.id)
  )
  const ban = useMutation(banAdminUserOptions(auth.authClient, actor?.user.id))
  const unban = useMutation(
    unbanAdminUserOptions(auth.authClient, actor?.user.id)
  )
  const remove = useMutation(
    removeAdminUserOptions(auth.authClient, actor?.user.id)
  )
  const impersonate = useMutation(
    impersonateAdminUserOptions(auth.authClient, actor?.user.id)
  )
  const revokeSession = useMutation(
    revokeAdminUserSessionOptions(auth.authClient, actor?.user.id, userId)
  )
  const revokeSessions = useMutation(
    revokeAdminUserSessionsOptions(auth.authClient, actor?.user.id, userId)
  )
  const configuredUserFields = useMemo(
    () =>
      fieldsWithModelValues(
        auth.additionalFields ?? [],
        user ? (user as unknown as Record<string, unknown>) : {}
      ),
    [auth.additionalFields, user]
  )
  const profileForm = useAuthForm({
    defaultValues: {
      additionalFields: getAdditionalFieldDefaultValues(configuredUserFields),
      email: "",
      emailVerified: false,
      name: "",
      roles: [config.defaultRole]
    },
    onSubmit: async ({ value }) => {
      if (!user) return

      const mutations: Promise<unknown>[] = []
      if (canUpdate.data?.success) {
        mutations.push(
          updateUser.mutateAsync({
            userId: user.id,
            data: {
              ...getAdditionalFieldSubmitValues(
                configuredUserFields,
                value.additionalFields
              ),
              name: value.name.trim(),
              ...(canSetEmail.data?.success
                ? {
                    email: value.email.trim(),
                    emailVerified: value.emailVerified
                  }
                : {})
            }
          })
        )
      }
      if (canSetRole.data?.success && !isSelf) {
        mutations.push(
          setRoleMutation.mutateAsync({
            userId: user.id,
            role: asAdminRoles(value.roles)
          })
        )
      }

      try {
        await Promise.all(mutations)
        onOpenChange(false)
      } catch {
        // Mutation errors are rendered next to the form.
      }
    }
  })

  useEffect(() => {
    profileForm.reset({
      additionalFields: getAdditionalFieldDefaultValues(configuredUserFields),
      email: user?.email ?? "",
      emailVerified: user?.emailVerified ?? false,
      name: user?.name ?? "",
      roles: parseAdminRoles(
        user?.role,
        config.defaultRole,
        config.allowMultipleRoles
      )
    })
  }, [
    config.allowMultipleRoles,
    config.defaultRole,
    configuredUserFields,
    profileForm.reset,
    user?.email,
    user?.emailVerified,
    user?.name,
    user?.role
  ])

  const confirm = () => {
    if (!user) return
    if (dangerousAction === "ban") {
      if (banDurationSeconds === null) return
      ban.mutate(
        {
          banExpiresIn: banDurationSeconds,
          banReason: banReason.trim() || undefined,
          userId: user.id
        },
        {
          onSuccess: () => {
            setBanDuration("")
            setBanReason("")
            setDangerousAction(undefined)
          }
        }
      )
    }
    if (dangerousAction === "delete")
      remove.mutate(
        { userId: user.id },
        {
          onSuccess: () => {
            setDangerousAction(undefined)
            onOpenChange(false)
          }
        }
      )
    if (dangerousAction === "revokeAll")
      revokeSessions.mutate(
        { userId: user.id },
        { onSuccess: () => setDangerousAction(undefined) }
      )
    if (dangerousAction === "impersonate")
      impersonate.mutate(
        { userId: user.id },
        {
          onSuccess: () => {
            setDangerousAction(undefined)
            if (config.impersonationRedirectTo)
              auth.navigate({ to: config.impersonationRedirectTo })
          }
        }
      )
  }
  const closeDangerousAction = () => {
    ban.reset()
    remove.reset()
    revokeSessions.reset()
    impersonate.reset()
    setBanDuration("")
    setBanReason("")
    setDangerousAction(undefined)
  }
  const dangerousMutation =
    dangerousAction === "ban"
      ? ban
      : dangerousAction === "delete"
        ? remove
        : dangerousAction === "revokeAll"
          ? revokeSessions
          : impersonate
  const dangerousError = getAdminErrorMessage(dangerousMutation.error)
  const dangerLabel =
    dangerousAction === "ban"
      ? config.localization.banUser
      : dangerousAction === "delete"
        ? config.localization.deleteUser
        : dangerousAction === "revokeAll"
          ? config.localization.revokeAllSessions
          : config.localization.impersonateUser

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="tw:h-[min(52rem,calc(100vh-2rem))] tw:grid-rows-[auto_minmax(0,1fr)] tw:gap-0 tw:overflow-hidden tw:p-0 tw:sm:max-w-4xl">
          <DialogHeader className="tw:border-b tw:px-6 tw:py-5 tw:pr-14">
            {user ? (
              <div className="tw:flex tw:items-center tw:justify-between tw:gap-4">
                <div className="tw:flex tw:min-w-0 tw:items-center tw:gap-3">
                  <UserAvatar className="tw:size-12" user={user} />
                  <div className="tw:min-w-0">
                    <DialogTitle className="tw:truncate">{user.name}</DialogTitle>
                    <DialogDescription className="tw:truncate">
                      {user.email}
                    </DialogDescription>
                  </div>
                </div>
                <div className="tw:flex tw:shrink-0 tw:items-center tw:gap-2">
                  <Badge variant={user.banned ? "destructive" : "secondary"}>
                    {user.banned
                      ? config.localization.banned
                      : config.localization.active}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label={config.localization.moreActions}
                          size="icon-sm"
                          variant="ghost"
                        >
                          <EllipsisIcon />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" className="tw:w-48">
                      <DropdownMenuGroup>
                        <DropdownMenuItem
                          disabled={
                            canImpersonate.isPending ||
                            !canImpersonate.data?.success ||
                            (targetIsAdmin &&
                              (canImpersonateAdmins.isPending ||
                                !canImpersonateAdmins.data?.success)) ||
                            isSelf
                          }
                          onSelect={() => setDangerousAction("impersonate")}
                        >
                          <LogInIcon />
                          {config.localization.impersonateUser}
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ) : (
              <>
                <DialogTitle>{config.localization.userDetails}</DialogTitle>
                <DialogDescription>
                  {config.localization.usersDescription}
                </DialogDescription>
              </>
            )}
          </DialogHeader>
          {detail.isPending ? (
            <div className="tw:flex tw:flex-col tw:gap-3 tw:p-6">
              <Skeleton className="tw:size-14 tw:rounded-full" />
              <Skeleton className="tw:h-5 tw:w-40" />
              <Skeleton className="tw:h-4 tw:w-64" />
            </div>
          ) : user ? (
            <Tabs
              className="tw:min-h-0 tw:gap-0 tw:overflow-hidden"
              defaultValue="overview"
            >
              <TabsList className="tw:mx-6 tw:h-11 tw:shrink-0" variant="line">
                <TabsTrigger value="overview">
                  <UserRound
                    aria-hidden="true"
                    className="tw:text-muted-foreground"
                  />
                  {config.localization.overview}
                </TabsTrigger>
                <TabsTrigger
                  disabled={
                    sessionsPermission.isPending ||
                    !sessionsPermission.data?.success
                  }
                  value="sessions"
                >
                  <Monitor
                    aria-hidden="true"
                    className="tw:text-muted-foreground"
                  />
                  {config.localization.sessions}
                </TabsTrigger>
                {contributedTabs.map((tab) => (
                  <TabsTrigger key={tab.value} value={tab.value}>
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
              <TabsContent className="tw:min-h-0 tw:overflow-hidden" value="overview">
                <profileForm.AppForm>
                  <profileForm.AuthFormRoot className="tw:grid tw:h-full tw:grid-rows-[minmax(0,1fr)_auto]">
                    <div className="tw:overflow-y-auto">
                      <section className="tw:flex tw:flex-col tw:gap-5 tw:p-6">
                        <h3 className="tw:font-medium">
                          {config.localization.profileAndAccess}
                        </h3>
                        <FieldGroup className="tw:grid tw:gap-5 tw:md:grid-cols-2">
                          <profileForm.Field name="name">
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor="admin-user-name">
                                  {config.localization.name}
                                </FieldLabel>
                                <InputGroup>
                                  <InputGroupInput
                                    disabled={!canUpdate.data?.success}
                                    id="admin-user-name"
                                    name={field.name}
                                    value={field.state.value}
                                    onChange={(event) =>
                                      field.handleChange(event.target.value)
                                    }
                                  />
                                </InputGroup>
                              </Field>
                            )}
                          </profileForm.Field>
                          <profileForm.Field name="email">
                            {(field) => (
                              <Field>
                                <FieldLabel htmlFor="admin-user-email">
                                  {config.localization.email}
                                </FieldLabel>
                                <InputGroup>
                                  <InputGroupInput
                                    disabled={
                                      !canUpdate.data?.success ||
                                      !canSetEmail.data?.success
                                    }
                                    id="admin-user-email"
                                    name={field.name}
                                    onChange={(event) =>
                                      field.handleChange(event.target.value)
                                    }
                                    required
                                    type="email"
                                    value={field.state.value}
                                  />
                                </InputGroup>
                              </Field>
                            )}
                          </profileForm.Field>
                          <profileForm.Field name="emailVerified">
                            {(field) => (
                              <Field orientation="horizontal">
                                <Switch
                                  checked={field.state.value}
                                  disabled={
                                    !canUpdate.data?.success ||
                                    !canSetEmail.data?.success
                                  }
                                  id="admin-user-email-verified"
                                  onCheckedChange={field.handleChange}
                                />
                                <FieldContent>
                                  <FieldLabel htmlFor="admin-user-email-verified">
                                    {config.localization.emailVerified}
                                  </FieldLabel>
                                </FieldContent>
                              </Field>
                            )}
                          </profileForm.Field>
                          <FieldSet>
                            <FieldLegend variant="label">
                              {config.localization.role}
                            </FieldLegend>
                            <profileForm.Field name="roles">
                              {(field) =>
                                config.allowMultipleRoles ? (
                                  <FieldGroup
                                    className="tw:flex-row tw:flex-wrap tw:gap-4"
                                    data-slot="checkbox-group"
                                  >
                                    {config.roles.map((item) => (
                                      <Field
                                        key={item}
                                        orientation="horizontal"
                                      >
                                        <Checkbox
                                          checked={field.state.value.includes(
                                            item
                                          )}
                                          disabled={
                                            isSelf || !canSetRole.data?.success
                                          }
                                          id={`admin-user-role-${item}`}
                                          onCheckedChange={(checked) => {
                                            const next = checked
                                              ? [...field.state.value, item]
                                              : field.state.value.filter(
                                                  (role) => role !== item
                                                )
                                            if (next.length)
                                              field.handleChange(next)
                                          }}
                                        />
                                        <FieldLabel
                                          htmlFor={`admin-user-role-${item}`}
                                        >
                                          {item}
                                        </FieldLabel>
                                      </Field>
                                    ))}
                                  </FieldGroup>
                                ) : (
                                  <RadioGroup
                                    className="tw:flex-row tw:flex-wrap tw:gap-4"
                                    disabled={
                                      isSelf || !canSetRole.data?.success
                                    }
                                    onValueChange={(role) =>
                                      field.handleChange([role])
                                    }
                                    value={field.state.value[0] ?? ""}
                                  >
                                    {config.roles.map((item) => (
                                      <Field
                                        key={item}
                                        orientation="horizontal"
                                      >
                                        <RadioGroupItem
                                          id={`admin-user-role-${item}`}
                                          value={item}
                                        />
                                        <FieldLabel
                                          htmlFor={`admin-user-role-${item}`}
                                        >
                                          {item}
                                        </FieldLabel>
                                      </Field>
                                    ))}
                                  </RadioGroup>
                                )
                              }
                            </profileForm.Field>
                          </FieldSet>
                          {configuredUserFields.map((configuredField) => (
                            <profileForm.AppField
                              key={configuredField.name}
                              name={`additionalFields.${configuredField.name}`}
                              validators={getAuthAdditionalFieldValidators(
                                configuredField,
                                auth.localization.auth.fieldRequired
                              )}
                            >
                              {(field) => (
                                <field.AuthFormAdditionalField
                                  field={configuredField}
                                  isPending={
                                    updateUser.isPending ||
                                    !canUpdate.data?.success
                                  }
                                />
                              )}
                            </profileForm.AppField>
                          ))}
                        </FieldGroup>
                        <FieldError>
                          {getAdminErrorMessage(updateUser.error) ??
                            getAdminErrorMessage(setRoleMutation.error)}
                        </FieldError>
                      </section>
                      <Separator />
                      <section className="tw:flex tw:flex-col tw:gap-4 tw:p-6">
                        <h3 className="tw:font-medium">
                          {config.localization.accountInformation}
                        </h3>
                        <dl className="tw:grid tw:gap-x-8 tw:gap-y-4 tw:text-sm tw:sm:grid-cols-2">
                          <div className="tw:flex tw:flex-col tw:gap-1">
                            <dt className="tw:text-muted-foreground">
                              {config.localization.userId}
                            </dt>
                            <dd className="tw:flex tw:min-w-0 tw:items-center tw:gap-1">
                              <code className="tw:truncate tw:text-xs">
                                {user.id}
                              </code>
                              <Button
                                aria-label={
                                  userIdCopied
                                    ? auth.localization.settings
                                        .copiedToClipboard
                                    : config.localization.copyUserId
                                }
                                onClick={() => copyUserId(user.id)}
                                size="icon-xs"
                                type="button"
                                variant="ghost"
                              >
                                {userIdCopied ? <CheckIcon /> : <CopyIcon />}
                              </Button>
                            </dd>
                          </div>
                          <div className="tw:flex tw:flex-col tw:gap-1">
                            <dt className="tw:text-muted-foreground">
                              {config.localization.created}
                            </dt>
                            <dd>{formatDate(user.createdAt)}</dd>
                          </div>
                          <div className="tw:flex tw:flex-col tw:gap-1">
                            <dt className="tw:text-muted-foreground">
                              {config.localization.status}
                            </dt>
                            <dd>
                              <Badge
                                variant={
                                  user.banned ? "destructive" : "secondary"
                                }
                              >
                                {user.banned
                                  ? config.localization.banned
                                  : config.localization.active}
                              </Badge>
                            </dd>
                          </div>
                          {user.banned && user.banReason ? (
                            <div className="tw:flex tw:flex-col tw:gap-1">
                              <dt className="tw:text-muted-foreground">
                                {config.localization.banReason}
                              </dt>
                              <dd>{user.banReason}</dd>
                            </div>
                          ) : null}
                          {user.banned && user.banExpires ? (
                            <div className="tw:flex tw:flex-col tw:gap-1">
                              <dt className="tw:text-muted-foreground">
                                {config.localization.banExpires}
                              </dt>
                              <dd>{formatDate(user.banExpires)}</dd>
                            </div>
                          ) : null}
                        </dl>
                      </section>
                      <Separator />
                      <section className="tw:flex tw:flex-col tw:gap-4 tw:p-6">
                        <h3 className="tw:font-medium">
                          {config.localization.security}
                        </h3>
                        <div>
                          <Button
                            disabled={
                              canSetPassword.isPending ||
                              !canSetPassword.data?.success
                            }
                            onClick={() => setPasswordOpen(true)}
                            type="button"
                            variant="outline"
                          >
                            <KeyRoundIcon />
                            {config.localization.setPassword}
                          </Button>
                        </div>
                      </section>
                      <Separator />
                      <section className="tw:flex tw:flex-col tw:gap-4 tw:p-6">
                        <h3 className="tw:font-medium">
                          {config.localization.dangerZone}
                        </h3>
                        <div className="tw:flex tw:flex-wrap tw:gap-2">
                          <Button
                            disabled={
                              canBan.isPending ||
                              !canBan.data?.success ||
                              isSelf
                            }
                            onClick={() =>
                              user.banned
                                ? unban.mutate({ userId: user.id })
                                : setDangerousAction("ban")
                            }
                            type="button"
                            variant="outline"
                          >
                            <BanIcon />
                            {user.banned
                              ? config.localization.unbanUser
                              : config.localization.banUser}
                          </Button>
                          <Button
                            disabled={
                              canDelete.isPending ||
                              !canDelete.data?.success ||
                              isSelf
                            }
                            onClick={() => setDangerousAction("delete")}
                            type="button"
                            variant="destructive"
                          >
                            <Trash2Icon />
                            {config.localization.deleteUser}
                          </Button>
                        </div>
                        {unban.error ? (
                          <FieldError>
                            {getAdminErrorMessage(unban.error)}
                          </FieldError>
                        ) : null}
                      </section>
                    </div>
                    <div className="tw:flex tw:flex-col-reverse tw:gap-2 tw:border-t tw:bg-muted/50 tw:px-6 tw:py-4 tw:sm:flex-row tw:sm:justify-end">
                      <Button
                        onClick={() => onOpenChange(false)}
                        type="button"
                        variant="outline"
                      >
                        {config.localization.cancel}
                      </Button>
                      <profileForm.Subscribe
                        selector={(state) => [
                          state.values.name,
                          state.values.email
                        ]}
                      >
                        {([name, email]) => (
                          <profileForm.AuthFormSubmitButton
                            disabled={
                              !name.trim() ||
                              !email.trim() ||
                              updateUser.isPending ||
                              setRoleMutation.isPending ||
                              canUpdate.isPending ||
                              canSetRole.isPending ||
                              (!canUpdate.data?.success &&
                                (!canSetRole.data?.success || isSelf))
                            }
                          >
                            {config.localization.saveChanges}
                          </profileForm.AuthFormSubmitButton>
                        )}
                      </profileForm.Subscribe>
                    </div>
                  </profileForm.AuthFormRoot>
                </profileForm.AppForm>
              </TabsContent>
              <TabsContent
                className="tw:min-h-0 tw:overflow-y-auto tw:p-6"
                value="sessions"
              >
                <div className="tw:flex tw:flex-col tw:gap-3">
                  {sessionsPermission.isPending || sessions.isPending ? (
                    skeletonRowIds
                      .slice(0, 3)
                      .map((id) => (
                        <Skeleton
                          className="tw:h-20 tw:w-full"
                          key={`session-${id}`}
                        />
                      ))
                  ) : !sessionsPermission.data?.success ? (
                    <p className="tw:text-sm tw:text-muted-foreground">
                      {config.localization.accessDeniedDescription}
                    </p>
                  ) : sessions.data?.sessions.length ? (
                    <>
                      <Button
                        className="tw:self-end"
                        disabled={
                          canRevoke.isPending ||
                          !canRevoke.data?.success ||
                          isSelf
                        }
                        onClick={() => setDangerousAction("revokeAll")}
                        variant="outline"
                      >
                        {config.localization.revokeAllSessions}
                      </Button>
                      {sessions.data.sessions.map((item) => (
                        <div
                          className="tw:flex tw:items-start tw:justify-between tw:gap-3 tw:rounded-lg tw:border tw:p-3"
                          key={item.id}
                        >
                          <div className="tw:min-w-0 tw:text-sm">
                            <div className="tw:truncate tw:font-medium">
                              {item.userAgent || config.localization.sessions}
                            </div>
                            <div className="tw:text-xs tw:text-muted-foreground">
                              {formatDate(item.createdAt)} ·{" "}
                              {formatDate(item.expiresAt)}
                            </div>
                            {config.showIpAddress && item.ipAddress ? (
                              <div className="tw:mt-1 tw:font-mono tw:text-xs tw:text-muted-foreground">
                                {item.ipAddress}
                              </div>
                            ) : null}
                          </div>
                          <Button
                            aria-label={config.localization.revoke}
                            disabled={
                              revokeSession.isPending ||
                              canRevoke.isPending ||
                              !canRevoke.data?.success ||
                              isSelf
                            }
                            onClick={() =>
                              revokeSession.mutate({ sessionToken: item.token })
                            }
                            size="icon-sm"
                            variant="ghost"
                          >
                            <Trash2Icon />
                          </Button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="tw:py-8 tw:text-center tw:text-sm tw:text-muted-foreground">
                      {config.localization.noSessions}
                    </p>
                  )}
                </div>
              </TabsContent>
              {contributedTabs.map((tab) => {
                const ContributedTab = tab.component
                return (
                  <TabsContent
                    className="tw:min-h-0 tw:overflow-y-auto tw:p-6"
                    key={tab.value}
                    value={tab.value}
                  >
                    <ContributedTab userId={user.id} />
                  </TabsContent>
                )
              })}
            </Tabs>
          ) : (
            <AdminState
              icon={<ShieldAlertIcon />}
              title={config.localization.loadUsersError}
              description={config.localization.loadUsersErrorDescription}
            />
          )}
        </DialogContent>
      </Dialog>
      <PasswordDialog
        open={passwordOpen}
        onOpenChange={setPasswordOpen}
        userId={user?.id}
      />
      <AlertDialog
        open={Boolean(dangerousAction)}
        onOpenChange={(value) => !value && closeDangerousAction()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{dangerLabel}</AlertDialogTitle>
            <AlertDialogDescription>{user?.email}</AlertDialogDescription>
          </AlertDialogHeader>
          {dangerousAction === "ban" ? (
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="admin-ban-reason">
                  {config.localization.banReason}
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="admin-ban-reason"
                    onChange={(event) => setBanReason(event.target.value)}
                    value={banReason}
                  />
                </InputGroup>
              </Field>
              <Field>
                <FieldLabel htmlFor="admin-ban-duration">
                  {config.localization.banDuration}
                </FieldLabel>
                <InputGroup>
                  <InputGroupInput
                    id="admin-ban-duration"
                    min="1"
                    onChange={(event) => setBanDuration(event.target.value)}
                    step="1"
                    type="number"
                    value={banDuration}
                  />
                </InputGroup>
                <p className="tw:text-xs tw:text-muted-foreground">
                  {config.localization.banDurationDescription}
                </p>
              </Field>
            </FieldGroup>
          ) : null}
          {dangerousError ? <FieldError>{dangerousError}</FieldError> : null}
          <AlertDialogFooter>
            <AlertDialogCancel>{config.localization.cancel}</AlertDialogCancel>
            <AlertDialogAction
              disabled={
                isSelf ||
                dangerousMutation.isPending ||
                (dangerousAction === "ban" && banDurationSeconds === null)
              }
              onClick={(event) => {
                event.preventDefault()
                confirm()
              }}
              variant={dangerousAction === "delete" ? "destructive" : "default"}
            >
              {dangerLabel}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function PasswordDialog({
  open,
  onOpenChange,
  userId
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId?: string
}) {
  const auth = useAuth<AdminAuthClient>()
  const config = useAuthPlugin(adminPlugin)
  const [password, setPassword] = useState("")
  const [errorMessage, setErrorMessage] = useState<string>()
  const mutation = useMutation(
    setAdminUserPasswordOptions(auth.authClient, () => {
      setTimeout(() => mutation.reset(), 0)
    })
  )
  const close = () => {
    setPassword("")
    setErrorMessage(undefined)
    mutation.reset()
    onOpenChange(false)
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    setErrorMessage(undefined)
    if (userId)
      mutation.mutate(
        { userId, newPassword: password },
        {
          onError: (error) => setErrorMessage(getAdminErrorMessage(error)),
          onSuccess: close
        }
      )
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => (value ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <form className="tw:flex tw:flex-col tw:gap-4" onSubmit={submit}>
          <DialogHeader>
            <DialogTitle>{config.localization.setPassword}</DialogTitle>
            <DialogDescription>
              {config.localization.userDetails}
            </DialogDescription>
          </DialogHeader>
          <Field data-invalid={Boolean(errorMessage)}>
            <FieldLabel htmlFor="admin-new-password">
              {config.localization.password}
            </FieldLabel>
            <InputGroup>
              <InputGroupInput
                aria-invalid={Boolean(errorMessage)}
                autoComplete="new-password"
                id="admin-new-password"
                onChange={(event) => setPassword(event.target.value)}
                required
                type="password"
                value={password}
              />
            </InputGroup>
            <FieldError>{errorMessage}</FieldError>
          </Field>
          <DialogFooter>
            <Button onClick={close} type="button" variant="outline">
              {config.localization.cancel}
            </Button>
            <Button disabled={!password || mutation.isPending} type="submit">
              {config.localization.setPassword}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
