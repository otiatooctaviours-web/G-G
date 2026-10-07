import { useState, type FormEvent } from 'react';
import { useServerFn } from '@tanstack/react-start';
import { ArrowUpRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { contactSchema } from '@/lib/contact-schema';
import { submitContact } from '@/lib/contact.functions';
export function ContactForm({ selectedPlan }: {selectedPlan:string}) {
 const submit = useServerFn(submitContact);
 const [errors,setErrors] = useState<Record<string,string>>({});
 const [pending,setPending] = useState(false);
 async function handleSubmit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  const form = event.currentTarget;
  const parsed = contactSchema.safeParse(Object.fromEntries(new FormData(form)));
  if (!parsed.success) { const next:Record<string,string>={}; for (const issue of parsed.error.issues) next[String(issue.path[0])]=issue.message; setErrors(next); toast.error('Please check the highlighted fields.'); return; }
  setErrors({}); setPending(true);
  try { await submit({data:parsed.data}); toast.success('Demo request received. Thank you for your interest in OfficeOps!'); form.reset(); }
  catch(error) { toast.error(error instanceof Error ? error.message : 'Your request could not be saved. Please try again.'); }
  finally {setPending(false);}
 }
 return <form onSubmit={handleSubmit} noValidate><div className="form-grid">{[{name:'name',label:'Full name',placeholder:'e.g. Alex Kamau',type:'text',autocomplete:'name',max:100},{name:'email',label:'Work email',placeholder:'alex@company.com',type:'email',autocomplete:'email',max:255},{name:'company',label:'Company',placeholder:'Your company name',type:'text',autocomplete:'organization',max:150},{name:'phone',label:'Phone number',placeholder:'+254 7XX XXX XXX',type:'tel',autocomplete:'tel',max:25}].map(field=><div className="field" key={field.name}><label htmlFor={field.name}>{field.label} <span className="text-primary">*</span></label><input id={field.name} name={field.name} type={field.type} placeholder={field.placeholder} autoComplete={field.autocomplete} maxLength={field.max} required aria-invalid={Boolean(errors[field.name])} aria-describedby={errors[field.name] ? `${field.name}-error` : undefined}/>{errors[field.name] && <span className="field-error" id={`${field.name}-error`}>{errors[field.name]}</span>}</div>)}<div className="field"><label htmlFor="team_size">Team size <span className="text-primary">*</span></label><select id="team_size" name="team_size" required defaultValue="" aria-invalid={Boolean(errors['team_size'])}><option value="" disabled>Select workstations</option>{['1–25','26–150','151+'].map(v=><option key={v}>{v}</option>)}</select>{errors['team_size'] && <span className="field-error">Choose your team size.</span>}</div><div className="field"><label htmlFor="plan">Interested plan <span className="text-primary">*</span></label><select id="plan" name="plan" required key={selectedPlan} defaultValue={selectedPlan}>{['Not sure yet','Starter','Business','Enterprise'].map(v=><option key={v}>{v}</option>)}</select></div><div className="field full"><label htmlFor="message">Anything we should know? <span className="text-muted-foreground font-normal">(optional)</span></label><textarea name="message" id="message" maxLength={2000} placeholder="Tell us a little about your office or call center…"/></div><div className="honeypot" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" autoComplete="off" tabIndex={-1}/></div></div><div className="submit-row"><Button type="submit" disabled={pending}>{pending ? <Loader2 className="animate-spin"/> : null}{pending ? 'Sending request…' : 'Book my demo'}{!pending && <ArrowUpRight/>}</Button><span className="form-note">Your details stay private.<br/>No spam. No obligation.</span></div></form>;
}
