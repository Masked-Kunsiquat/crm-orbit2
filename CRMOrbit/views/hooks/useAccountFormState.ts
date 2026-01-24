import { useCallback, useEffect, useRef, useState } from "react";
import type {
  Account,
  Address,
  AccountAuditFrequency,
  AccountAuditFrequencyChangeTiming,
  SocialMediaLinks,
} from "@domains/account";
import { DEFAULT_ACCOUNT_AUDIT_FREQUENCY } from "@domains/account.utils";
import type { Timestamp } from "@domains/shared/types";

export type AccountStatus = "account.status.active" | "account.status.inactive";

export type AccountFormState = {
  // Basic fields
  name: string;
  setName: (name: string) => void;
  organizationId: string;
  setOrganizationId: (id: string) => void;
  status: AccountStatus;
  setStatus: (status: AccountStatus) => void;

  // Lifecycle dates
  activeAt: Timestamp;
  setActiveAt: (timestamp: Timestamp) => void;
  inactiveAt: Timestamp;
  setInactiveAt: (timestamp: Timestamp) => void;
  activeDatePicker: "activeAt" | "inactiveAt" | null;
  setActiveDatePicker: (picker: "activeAt" | "inactiveAt" | null) => void;
  getLifecycleDate: (field: "activeAt" | "inactiveAt") => Date;
  updateLifecycleDate: (field: "activeAt" | "inactiveAt", date: Date) => void;

  // Audit frequency
  auditFrequency: AccountAuditFrequency;
  setAuditFrequency: (freq: AccountAuditFrequency) => void;
  auditFrequencyChangeTiming: AccountAuditFrequencyChangeTiming;
  setAuditFrequencyChangeTiming: (
    timing: AccountAuditFrequencyChangeTiming,
  ) => void;
  initialAuditFrequency: AccountAuditFrequency;
  isFrequencyChanged: boolean;

  // Addresses
  siteAddress: Address;
  setSiteAddress: (address: Address) => void;
  parkingAddress: Address;
  setParkingAddress: (address: Address) => void;
  useSameForParking: boolean;
  setUseSameForParking: (value: boolean) => void;

  // Floor configuration
  minFloorInput: string;
  setMinFloorInput: (value: string) => void;
  maxFloorInput: string;
  setMaxFloorInput: (value: string) => void;
  excludedFloorsInput: string;
  setExcludedFloorsInput: (value: string) => void;

  // Optional fields
  website: string;
  setWebsite: (website: string) => void;
  socialMedia: SocialMediaLinks;
  setSocialMedia: (links: SocialMediaLinks) => void;

  // Organization picker
  isOrganizationPickerOpen: boolean;
  setIsOrganizationPickerOpen: (open: boolean) => void;

  // Handler methods
  handleSiteAddressChange: (field: keyof Address, value: string) => void;
  handleParkingAddressChange: (field: keyof Address, value: string) => void;
  handleUseSameForParkingChange: (value: boolean) => void;
  handleSocialMediaChange: (
    platform: keyof SocialMediaLinks,
    value: string,
  ) => void;
  handleAuditFrequencyChange: (value: AccountAuditFrequency) => void;
  handleStatusChange: (status: AccountStatus) => void;
};

export type UseAccountFormStateParams = {
  account?: Account;
  prefillOrganizationId?: string;
  defaultOrganizationId?: string;
};

const emptyAddress: Address = {
  street: "",
  city: "",
  state: "",
  zipCode: "",
};

/**
 * Manages account form state including addresses, floor config, and audit frequency.
 * Handles initialization from existing account or prefill data.
 */
const getTodayTimestamp = (): Timestamp => new Date().toISOString();

export const useAccountFormState = ({
  account,
  prefillOrganizationId,
  defaultOrganizationId,
}: UseAccountFormStateParams): AccountFormState => {
  // Basic fields
  const [name, setName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [status, setStatus] = useState<AccountStatus>("account.status.active");

  // Lifecycle dates
  const [activeAt, setActiveAt] = useState<Timestamp>("");
  const [inactiveAt, setInactiveAt] = useState<Timestamp>("");
  const [activeDatePicker, setActiveDatePicker] = useState<
    "activeAt" | "inactiveAt" | null
  >(null);

  // Audit frequency
  const [auditFrequency, setAuditFrequency] = useState<AccountAuditFrequency>(
    DEFAULT_ACCOUNT_AUDIT_FREQUENCY,
  );
  const [auditFrequencyChangeTiming, setAuditFrequencyChangeTiming] =
    useState<AccountAuditFrequencyChangeTiming>(
      "account.auditFrequencyChange.immediate",
    );
  const [initialAuditFrequency, setInitialAuditFrequency] =
    useState<AccountAuditFrequency>(DEFAULT_ACCOUNT_AUDIT_FREQUENCY);

  // Addresses
  const [siteAddress, setSiteAddress] = useState<Address>({ ...emptyAddress });
  const [parkingAddress, setParkingAddress] = useState<Address>({
    ...emptyAddress,
  });
  const [useSameForParking, setUseSameForParking] = useState(false);

  // Floor configuration
  const [minFloorInput, setMinFloorInput] = useState("");
  const [maxFloorInput, setMaxFloorInput] = useState("");
  const [excludedFloorsInput, setExcludedFloorsInput] = useState("");

  // Optional fields
  const [website, setWebsite] = useState("");
  const [socialMedia, setSocialMedia] = useState<SocialMediaLinks>({});

  // Organization picker
  const [isOrganizationPickerOpen, setIsOrganizationPickerOpen] =
    useState(false);

  // Track account changes to avoid re-initializing on every render
  const lastAccountIdRef = useRef<string | undefined>(undefined);

  // Initialize organization from prefill when creating new account
  useEffect(() => {
    if (!account && prefillOrganizationId) {
      setOrganizationId(prefillOrganizationId);
    }
  }, [account, prefillOrganizationId]);

  // Initialize form state from account or defaults
  useEffect(() => {
    const currentAccountId = account?.id;
    const isAccountChanged = currentAccountId !== lastAccountIdRef.current;

    if (!isAccountChanged) {
      return;
    }

    lastAccountIdRef.current = currentAccountId;

    if (account) {
      // Resolve pending audit frequency if effective
      const pendingEffectiveAt = account.auditFrequencyPendingEffectiveAt
        ? Date.parse(account.auditFrequencyPendingEffectiveAt)
        : Number.NaN;
      const resolvedAuditFrequency =
        account.auditFrequencyPending &&
        !Number.isNaN(pendingEffectiveAt) &&
        Date.now() >= pendingEffectiveAt
          ? account.auditFrequencyPending
          : (account.auditFrequency ?? DEFAULT_ACCOUNT_AUDIT_FREQUENCY);

      setName(account.name);
      setOrganizationId(account.organizationId);
      setStatus(account.status);
      setActiveAt(account.activeAt ?? "");
      setInactiveAt(account.inactiveAt ?? "");
      setAuditFrequency(resolvedAuditFrequency);
      setInitialAuditFrequency(resolvedAuditFrequency);
      setAuditFrequencyChangeTiming("account.auditFrequencyChange.immediate");
      setSiteAddress(account.addresses?.site ?? { ...emptyAddress });
      setParkingAddress(account.addresses?.parking ?? { ...emptyAddress });
      setUseSameForParking(account.addresses?.useSameForParking ?? false);
      setWebsite(account.website || "");
      setSocialMedia(account.socialMedia || {});
      setMinFloorInput(
        account.minFloor !== undefined ? `${account.minFloor}` : "",
      );
      setMaxFloorInput(
        account.maxFloor !== undefined ? `${account.maxFloor}` : "",
      );
      setExcludedFloorsInput(
        account.excludedFloors?.length ? account.excludedFloors.join(", ") : "",
      );
    } else {
      // New account - reset to defaults
      setName("");
      setOrganizationId(defaultOrganizationId ?? "");
      setStatus("account.status.active");
      setActiveAt(getTodayTimestamp()); // Auto-fill today for new accounts
      setInactiveAt("");
      setAuditFrequency(DEFAULT_ACCOUNT_AUDIT_FREQUENCY);
      setInitialAuditFrequency(DEFAULT_ACCOUNT_AUDIT_FREQUENCY);
      setAuditFrequencyChangeTiming("account.auditFrequencyChange.immediate");
      setSiteAddress({ ...emptyAddress });
      setParkingAddress({ ...emptyAddress });
      setUseSameForParking(false);
      setWebsite("");
      setSocialMedia({});
      setMinFloorInput("");
      setMaxFloorInput("");
      setExcludedFloorsInput("");
    }
  }, [account, defaultOrganizationId]);

  // Handler methods
  const handleSiteAddressChange = useCallback(
    (field: keyof Address, value: string) => {
      setSiteAddress((prev) => ({ ...prev, [field]: value }));
      if (useSameForParking) {
        setParkingAddress((prev) => ({ ...prev, [field]: value }));
      }
    },
    [useSameForParking],
  );

  const handleParkingAddressChange = useCallback(
    (field: keyof Address, value: string) => {
      setParkingAddress((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const handleUseSameForParkingChange = useCallback(
    (value: boolean) => {
      setUseSameForParking(value);
      if (value) {
        setParkingAddress(siteAddress);
      }
    },
    [siteAddress],
  );

  const handleSocialMediaChange = useCallback(
    (platform: keyof SocialMediaLinks, value: string) => {
      setSocialMedia((prev) => ({
        ...prev,
        [platform]: value.trim() || undefined,
      }));
    },
    [],
  );

  const handleAuditFrequencyChange = useCallback(
    (value: AccountAuditFrequency) => {
      setAuditFrequency(value);
      if (value !== initialAuditFrequency) {
        setAuditFrequencyChangeTiming("account.auditFrequencyChange.immediate");
      }
    },
    [initialAuditFrequency],
  );

  const handleStatusChange = useCallback(
    (newStatus: AccountStatus) => {
      setStatus(newStatus);
      // Auto-set inactiveAt when becoming inactive
      if (newStatus === "account.status.inactive" && !inactiveAt) {
        setInactiveAt(getTodayTimestamp());
      }
      // Clear inactiveAt when becoming active
      if (newStatus === "account.status.active") {
        setInactiveAt("");
      }
    },
    [inactiveAt],
  );

  const getLifecycleDate = useCallback(
    (field: "activeAt" | "inactiveAt") => {
      const timestamp = field === "activeAt" ? activeAt : inactiveAt;
      const date = new Date(timestamp || new Date().toISOString());
      if (Number.isNaN(date.getTime())) {
        return new Date();
      }
      return date;
    },
    [activeAt, inactiveAt],
  );

  const updateLifecycleDate = useCallback(
    (field: "activeAt" | "inactiveAt", date: Date) => {
      const timestamp = date.toISOString();
      if (field === "activeAt") {
        setActiveAt(timestamp);
      } else {
        setInactiveAt(timestamp);
      }
    },
    [],
  );

  const isFrequencyChanged = auditFrequency !== initialAuditFrequency;

  return {
    // Basic fields
    name,
    setName,
    organizationId,
    setOrganizationId,
    status,
    setStatus,

    // Lifecycle dates
    activeAt,
    setActiveAt,
    inactiveAt,
    setInactiveAt,
    activeDatePicker,
    setActiveDatePicker,
    getLifecycleDate,
    updateLifecycleDate,

    // Audit frequency
    auditFrequency,
    setAuditFrequency,
    auditFrequencyChangeTiming,
    setAuditFrequencyChangeTiming,
    initialAuditFrequency,
    isFrequencyChanged,

    // Addresses
    siteAddress,
    setSiteAddress,
    parkingAddress,
    setParkingAddress,
    useSameForParking,
    setUseSameForParking,

    // Floor configuration
    minFloorInput,
    setMinFloorInput,
    maxFloorInput,
    setMaxFloorInput,
    excludedFloorsInput,
    setExcludedFloorsInput,

    // Optional fields
    website,
    setWebsite,
    socialMedia,
    setSocialMedia,

    // Organization picker
    isOrganizationPickerOpen,
    setIsOrganizationPickerOpen,

    // Handler methods
    handleSiteAddressChange,
    handleParkingAddressChange,
    handleUseSameForParkingChange,
    handleSocialMediaChange,
    handleAuditFrequencyChange,
    handleStatusChange,
  };
};
