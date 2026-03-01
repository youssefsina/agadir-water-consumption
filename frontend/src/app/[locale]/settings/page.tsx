"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDevMode } from "@/hooks/use-dev-mode";
import {
    Settings,
    Phone,
    UserPlus,
    Trash2,
    ToggleLeft,
    ToggleRight,
    RefreshCw,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
} from "lucide-react";
import {
    getWhatsAppContacts,
    addWhatsAppContact,
    updateWhatsAppContact,
    deleteWhatsAppContact,
    WhatsAppContact,
} from "@/lib/api";

export default function SettingsPage() {
    const t = useTranslations("settings");

    const [contacts, setContacts] = useState<WhatsAppContact[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const { devMode, toggleDevMode } = useDevMode();

    // Form state
    const [newName, setNewName] = useState("");
    const [newPhone, setNewPhone] = useState("");

    async function fetchContacts() {
        setLoading(true);
        setError(null);
        try {
            const res = await getWhatsAppContacts();
            setContacts(res.contacts || []);
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to load contacts");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        fetchContacts();
    }, []);

    // Auto-dismiss success message
    useEffect(() => {
        if (success) {
            const timer = setTimeout(() => setSuccess(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [success]);

    async function handleAdd() {
        if (!newName.trim() || !newPhone.trim()) {
            setError(t("fillBothFields"));
            return;
        }
        setSaving(true);
        setError(null);
        try {
            await addWhatsAppContact(newName.trim(), newPhone.trim());
            setNewName("");
            setNewPhone("");
            setSuccess(t("contactAdded"));
            await fetchContacts();
        } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : "Failed to add contact";
            if (msg.includes("409")) {
                setError(t("phoneExists"));
            } else {
                setError(msg);
            }
        } finally {
            setSaving(false);
        }
    }

    async function handleToggle(contact: WhatsAppContact) {
        try {
            await updateWhatsAppContact(contact.id, { active: !contact.active });
            await fetchContacts();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to update contact");
        }
    }

    async function handleDelete(id: number) {
        try {
            await deleteWhatsAppContact(id);
            setSuccess(t("contactDeleted"));
            await fetchContacts();
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : "Failed to delete contact");
        }
    }

    return (
        <div className="min-h-screen bg-green-50/30 p-4 md:p-8 font-sans text-green-950 pt-20">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Settings className="w-8 h-8 text-green-600" />
                        {t("title")}
                    </h1>
                    <p className="text-green-700/70 mt-1">{t("subtitle")}</p>
                </div>

                {/* Status messages */}
                {success && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-green-100 border border-green-300 text-green-800 text-sm">
                        <CheckCircle2 className="w-4 h-4" />
                        {success}
                    </div>
                )}
                {error && (
                    <div className="flex items-center gap-2 p-3 rounded-xl bg-red-100 border border-red-300 text-red-800 text-sm">
                        <AlertCircle className="w-4 h-4" />
                        {error}
                        <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">×</button>
                    </div>
                )}

                {/* System Preferences Card */}
                <Card className="rounded-3xl border-2 border-green-200 shadow-md">
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-green-100">
                                <Settings className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <CardTitle className="text-lg">System Preferences</CardTitle>
                                <CardDescription>Configure global app behavior</CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-2xl bg-green-50/50 border border-green-100">
                            <div className="space-y-0.5">
                                <h4 className="font-bold text-green-900">Developer Debug Mode</h4>
                                <p className="text-sm text-green-700/80 font-medium">Show advanced simulator and testing tools on Dashboard and Map.</p>
                            </div>
                            <Switch checked={devMode} onCheckedChange={toggleDevMode} />
                        </div>
                    </CardContent>
                </Card>

                {/* WhatsApp Notifications Card */}
                <Card className="rounded-3xl border-2 border-green-200 shadow-md">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-xl bg-green-100">
                                    <MessageSquare className="w-6 h-6 text-green-600" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg">{t("whatsappTitle")}</CardTitle>
                                    <CardDescription>{t("whatsappDesc")}</CardDescription>
                                </div>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={fetchContacts}
                                className="rounded-xl"
                                disabled={loading}
                            >
                                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Add Contact Form */}
                        <div className="p-4 rounded-2xl bg-green-50 border border-green-200 space-y-3">
                            <h3 className="font-semibold text-sm flex items-center gap-2">
                                <UserPlus className="w-4 h-4 text-green-600" />
                                {t("addContact")}
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs text-green-700 mb-1 block">{t("nameLabel")}</label>
                                    <Input
                                        placeholder={t("namePlaceholder")}
                                        value={newName}
                                        onChange={(e) => setNewName(e.target.value)}
                                        className="rounded-xl border-green-300 focus:border-green-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-green-700 mb-1 block">{t("phoneLabel")}</label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-500" />
                                        <Input
                                            placeholder={t("phonePlaceholder")}
                                            value={newPhone}
                                            onChange={(e) => setNewPhone(e.target.value)}
                                            className="rounded-xl border-green-300 focus:border-green-500 ltr:pl-9 rtl:pr-9"
                                        />
                                    </div>
                                </div>
                            </div>
                            <Button
                                onClick={handleAdd}
                                disabled={saving || !newName.trim() || !newPhone.trim()}
                                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white rounded-xl"
                            >
                                {saving ? (
                                    <RefreshCw className="w-4 h-4 animate-spin ltr:mr-2 rtl:ml-2" />
                                ) : (
                                    <UserPlus className="w-4 h-4 ltr:mr-2 rtl:ml-2" />
                                )}
                                {t("addButton")}
                            </Button>
                        </div>

                        {/* Contact List */}
                        <div className="space-y-2">
                            <h3 className="font-semibold text-sm text-green-800">
                                {t("contactList")} ({contacts.length})
                            </h3>

                            {loading && contacts.length === 0 ? (
                                <div className="text-center py-8 text-green-600">
                                    <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                                    {t("loading")}
                                </div>
                            ) : contacts.length === 0 ? (
                                <div className="text-center py-8 text-green-500 text-sm">
                                    <Phone className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    {t("noContacts")}
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {contacts.map((contact) => (
                                        <div
                                            key={contact.id}
                                            className={`flex items-center justify-between p-3 rounded-xl border transition-all ${contact.active
                                                    ? "bg-white border-green-200 hover:border-green-400"
                                                    : "bg-gray-50 border-gray-200 opacity-60"
                                                }`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${contact.active ? "bg-green-500" : "bg-gray-400"
                                                        }`}
                                                />
                                                <div>
                                                    <p className="font-medium text-sm">{contact.name}</p>
                                                    <p className="text-xs text-green-600 font-mono">{contact.phone}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleToggle(contact)}
                                                    className="rounded-lg h-8 w-8"
                                                    title={contact.active ? t("deactivate") : t("activate")}
                                                >
                                                    {contact.active ? (
                                                        <ToggleRight className="w-5 h-5 text-green-600" />
                                                    ) : (
                                                        <ToggleLeft className="w-5 h-5 text-gray-400" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(contact.id)}
                                                    className="rounded-lg h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                                    title={t("delete")}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Info box */}
                        <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs">
                            <p className="font-semibold mb-1">ℹ️ {t("infoTitle")}</p>
                            <p>{t("infoDesc")}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
