import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { Database } from 'database.types';

export let supabase: SupabaseClient;

export const initSupabase = async () => {
	try {
		supabase = await createClient(
			process.env.SUPABASE_URL,
			process.env.SUPABASE_PUBLIC_KEY
		);

		console.log('supabase init successfuly');
	} catch (error) {
		console.log('failed to init supabase client');
	}
};

export const getServiceClient = () =>
	createClient<Database>(
		process.env.SUPABASE_URL,
		process.env.SUPABASE_SERVICE_KEY
	);
