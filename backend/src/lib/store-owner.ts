import type { Database, Entity } from "../types.js";
import { now } from "./helpers.js";

export async function repairStoreOwnerByContactEmail(db: Database, storeId: string) {
  const store = await db.get<Entity>("stores", storeId);
  if (!store) throw new Error(`Store not found: ${storeId}`);

  const contact = store.contact as Entity | undefined;
  const email = String(contact?.email ?? "").trim().toLowerCase();
  if (!email) throw new Error(`Store has no contact email: ${storeId}`);

  const owner = (await db.list<Entity>("users")).find(
    (user) => String(user.email ?? "").trim().toLowerCase() === email,
  );
  if (!owner) throw new Error(`No user account matches the store contact email: ${email}`);

  const previousOwnerId = String(store.ownerId ?? "");
  await db.update("users", owner.id, {
    role: "vendor",
    storeId: store.id,
    status: "active",
    updatedAt: now(),
  });
  await db.update("stores", store.id, { ownerId: owner.id, updatedAt: now() });

  if (previousOwnerId && previousOwnerId !== owner.id) {
    await reassignOwnerReferences(db, previousOwnerId, owner.id);
  }

  return { userId: owner.id, storeId: store.id, email };
}

async function reassignOwnerReferences(db: Database, fromUserId: string, toUserId: string) {
  const mappings: Array<[string, string[]]> = [
    ["subscriptions", ["vendorId"]],
    ["transactions", ["vendorId", "userId"]],
    ["payouts", ["vendorId"]],
    ["notifications", ["userId"]],
    ["messages", ["vendorId", "senderId", "userId"]],
  ];

  for (const [collection, fields] of mappings) {
    const records = await db.list<Entity>(collection);
    for (const record of records) {
      const patch = Object.fromEntries(
        fields
          .filter((field) => record[field] === fromUserId)
          .map((field) => [field, toUserId]),
      );
      if (Object.keys(patch).length > 0) await db.update(collection, record.id, patch);
    }
  }

  const oldBankAccount = await db.get<Entity>("bankAccounts", fromUserId);
  if (oldBankAccount && !(await db.get("bankAccounts", toUserId))) {
    const { id: _oldId, ...account } = oldBankAccount;
    await db.create("bankAccounts", { ...account, id: toUserId, vendorId: toUserId });
    await db.remove("bankAccounts", fromUserId);
  }
}
