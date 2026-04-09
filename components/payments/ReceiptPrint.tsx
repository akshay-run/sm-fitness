type ReceiptPrintData = {
  gymName: string;
  receiptNumber: string;
  paymentDate: string;
  memberName: string;
  memberCode: string;
  planName: string;
  startDate: string;
  endDate: string;
  paymentMode: string;
  amount: number;
  upiRef?: string | null;
};

export function ReceiptPrint({ data }: { data: ReceiptPrintData }) {
  return (
    <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 print:mt-0 print:rounded-none print:border-0 print:p-0">
      <div className="border-b border-zinc-200 pb-3">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">{data.gymName}</h2>
        <p className="text-sm text-zinc-600">Payment Receipt</p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row label="Receipt number" value={data.receiptNumber} />
        <Row label="Payment date" value={new Date(data.paymentDate).toLocaleString()} />
        <Row label="Member name" value={data.memberName} />
        <Row label="Member code" value={data.memberCode} />
        <Row label="Plan" value={data.planName} />
        <Row label="Membership dates" value={`${data.startDate} to ${data.endDate}`} />
        <Row label="Payment mode" value={data.paymentMode.toUpperCase()} />
        <Row label="Amount" value={`₹${Number(data.amount).toFixed(2)}`} />
        <Row label="UPI Ref / UTR" value={data.upiRef || "—"} />
      </div>

      <p className="mt-6 text-xs text-zinc-500">
        This is a system generated receipt.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
      <div className="text-xs font-medium text-zinc-600">{label}</div>
      <div className="mt-1 text-sm font-medium text-zinc-900">{value}</div>
    </div>
  );
}

