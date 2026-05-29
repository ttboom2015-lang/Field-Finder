        

 // 1. Bypass corporate SSL inspection
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { HttpsProxyAgent } = require('https-proxy-agent');
const fetch = require('cross-fetch');
const nodemailer = require('nodemailer');
const ical = require('node-ical');

const app = express();
app.use(cors());
app.use(express.json());

// 2. Supabase Setup
const supabaseUrl = 'https://lsquxrvufehselooyenj.supabase.co';
const supabaseKey = 'sb_publishable_TANOMAeqEQwjo0PYtjbn_Q_WkdLbwyb'; 

let supabase;

// BULLETPROOF PROXY TOGGLE:
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
    console.log("Running in Cloud: Connecting to Supabase directly...");
    supabase = createClient(supabaseUrl, supabaseKey);
} else {
    console.log("Running Locally: Routing through ThreatPulse proxy...");
    const proxyAgent = new HttpsProxyAgent('http://ep.threatpulse.net:80');
    const customFetch = (url, options = {}) => {
        return fetch(url, { ...options, agent: proxyAgent });
    };
    supabase = createClient(supabaseUrl, supabaseKey, {
        global: { fetch: customFetch }
    });
}

// 3. Email Setup
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { 
        user: 'ttboom2015@gmail.com',         
        pass: 'Ykazb lwxi dyix mqfu' // <--- REPLACE WITH YOUR REAL GMAIL APP PASSWORD
    }
});
// ==========================================
// API ENDPOINTS
// ==========================================

// --- 1. SEARCH FOR AVAILABLE FIELDS (Used in Search.tsx) ---
app.get('/api/fields/available', async (req, res) => {
    const { sport, startDate, endDate, postalCode } = req.query;
    try {
        const { data, error } = await supabase.rpc('search_available_fields', {
            p_sport: sport || 'Soccer',
            p_start_date: startDate || '2026-01-01T00:00:00Z',
            p_end_date: endDate || '2026-12-31T23:59:59Z',
            p_postal_code: postalCode || 'H2X',
            p_radius_km: 20
        });
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 2. SEARCH FOR OPPONENT TEAMS (Used in TeamFinder.tsx) ---
// --- GET /api/teams/available (UPGRADED FOR OVERLAP LOGIC) ---
app.get('/api/teams/available', async (req, res) => {
    const { sport, postalCode, ageGroup, division, gender, startDate, endDate, startTime, endTime } = req.query;
    
    try {
        // 1. Get base teams
        const { data: teams, error } = await supabase.rpc('search_available_teams', {
            p_sport: sport || 'Soccer', 
            p_start_date: '2020-01-01T00:00:00Z', 
            p_end_date: '2030-01-01T00:00:00Z',
            p_postal_code: postalCode || 'H2X', 
            p_radius_km: 50,
            p_age_group: ageGroup || 'U12', 
            p_division: division || 'Division 1', 
            p_gender: gender || 'Boys'
        });
        if (error) throw error;

        // If no dates provided, return empty (manager must provide dates to find overlaps)
        if (!startDate || !endDate) return res.json([]);

        const windowStart = new Date(`${startDate}T00:00:00`).toISOString();
        const windowEnd = new Date(`${endDate}T23:59:59`).toISOString();
        const teamIds = teams.map(t => t.team_id);

        // 2. Fetch all availabilities for these teams in the massive date range
        const { data: availabilities } = await supabase
            .from('team_availabilities')
            .select('team_id, start_time, end_time, status')
            .in('team_id', teamIds)
            .gte('start_time', windowStart)
            .lte('start_time', windowEnd)
            .eq('status', 'available'); // ONLY grab available slots

        // 3. Filter teams: Keep ONLY teams that have at least one 'available' slot matching the hours requested
        const sHour = parseInt(startTime?.split(':')[0] || '0');
        const eHour = parseInt(endTime?.split(':')[0] || '23');

        const availableTeams = teams.filter(team => {
            const teamAvails = availabilities?.filter(a => a.team_id === team.team_id) || [];
            if (teamAvails.length === 0) return false;

            // Check if any of their available slots fall within the daily hour restrictions
            const hasValidSlot = teamAvails.some(slot => {
                const slotHour = new Date(slot.start_time).getHours();
                return slotHour >= sHour && slotHour <= eHour;
            });

            return hasValidSlot;
        }).map(team => {
            // Attach the opponent's valid available slots to the team object so the frontend can use it!
            const teamAvails = availabilities?.filter(a => a.team_id === team.team_id) || [];
            return { ...team, calculated_status: 'green', available_slots: teamAvails };
        });

        res.json(availableTeams);
    } catch (err) {
        console.error("Team Search Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// --- NEW: FETCH TEAM SCHEDULE ---
app.get('/api/team-schedule', async (req, res) => {
    const { teamId, date } = req.query;
    try {
        const startOfDay = new Date(`${date}T00:00:00`).toISOString();
        const endOfDay = new Date(`${date}T23:59:59.999`).toISOString();
        const { data, error } = await supabase.from('team_availabilities')
            .select('*').eq('team_id', teamId).gte('start_time', startOfDay).lte('start_time', endOfDay);
        if (error) throw error;
        res.json(data || []);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- NEW: UPDATE TEAM SCHEDULE (BULK & SINGLE) ---
app.post('/api/team-schedule/update', async (req, res) => {
    const { toInsert, toUpdateIds, status } = req.body;
    try {
        if (toInsert && toInsert.length > 0) await supabase.from('team_availabilities').insert(toInsert);
        if (toUpdateIds && toUpdateIds.length > 0) await supabase.from('team_availabilities').update({ status }).in('id', toUpdateIds);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});


// --- 3. GET A SPECIFIC MANAGER'S TEAM (Used in EditTeam, Matches, etc.) ---
app.get('/api/my-team', async (req, res) => {
    const { managerId } = req.query;
    if (!managerId) return res.status(400).json({ error: "Missing managerId parameter" });

    try {
        const { data, error } = await supabase
            .from('teams')
            .select('*')
            .eq('manager_id', managerId)
            .limit(1) // Prevents PGRST116 crash if there are duplicate teams!
            .maybeSingle(); 

        if (error) throw error;
        res.json(data || {});
    } catch (err) {
        console.error("Server Error (/api/my-team):", err);
        res.status(500).json({ error: err.message });
    }
});

// --- 4. CREATE A NEW TEAM (Used in CreateTeam.tsx) ---
app.post('/api/teams', async (req, res) => {
    const { teamName, sport, ageGroup, division, address, postalCode, gender, manager_id, managerName, managerEmail, managerPhone, hcName, hcEmail, hcPhone, ac1Name, ac1Email, ac1Phone, ac2Name, ac2Email, ac2Phone } = req.body;
    if (!manager_id) return res.status(400).json({ error: "Missing manager_id" });

    try {
        const { data, error } = await supabase.from('teams').insert([{
            manager_id, team_name: teamName, sport, age_group: ageGroup, division, address, postal_code: postalCode, gender: gender || 'Boys',
            manager_name: managerName, 
            contact_email: managerEmail, 
            manager_phone: managerPhone,
            hc_name: hcName, hc_email: hcEmail, hc_phone: hcPhone,
            ac1_name: ac1Name, ac1_email: ac1Email, ac1_phone: ac1Phone,
            ac2_name: ac2Name, ac2_email: ac2Email, ac2_phone: ac2Phone
        }]).select();
        
        if (error) throw error;
        res.json({ message: 'Team saved!', team: data[0] });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- 5. UPDATE EXISTING TEAM (Used in EditTeam.tsx) ---
app.put('/api/teams', async (req, res) => {
    const { teamId, teamName, sport, ageGroup, division, address, postalCode, gender, managerName, managerEmail, managerPhone, hcName, hcEmail, hcPhone, ac1Name, ac1Email, ac1Phone, ac2Name, ac2Email, ac2Phone } = req.body;
    if (!teamId) return res.status(400).json({ error: "Missing teamId" });

    try {
        const { error } = await supabase.from('teams').update({
            team_name: teamName, sport, age_group: ageGroup, division, address, postal_code: postalCode, gender,
            manager_name: managerName, 
            contact_email: managerEmail, 
            manager_phone: managerPhone,
            hc_name: hcName, hc_email: hcEmail, hc_phone: hcPhone,
            ac1_name: ac1Name, ac1_email: ac1Email, ac1_phone: ac1Phone,
            ac2_name: ac2Name, ac2_email: ac2Email, ac2_phone: ac2Phone
        }).eq('id', teamId);
        
        if (error) throw error;
        res.json({ message: 'Team updated successfully!' });
    } catch (err) { 
        res.status(500).json({ error: err.message }); 
    }
});

// --- 6. BOOK A FIELD SLOT (Used in ClubAvailabilities.tsx) ---
app.post('/api/book-match', async (req, res) => {
    const { availabilityIds, myTeamId, opponentTeamId } = req.body;
    
    console.log("--- BOOKING REQUEST RECEIVED ---");
    console.log("Team ID:", myTeamId);
    console.log("Slots to Book:", availabilityIds);

    if (!availabilityIds || availabilityIds.length === 0) {
        return res.status(400).json({ error: 'No time slots selected!' });
    }
    if (!myTeamId) {
        return res.status(400).json({ error: 'You must create a team profile first!' });
    }

    try {
        // 1. Verify the Team actually exists in the database
        const { data: teamCheck } = await supabase.from('teams').select('id').eq('id', myTeamId).maybeSingle();
        if (!teamCheck) {
            console.error("Team ID does not exist in the database:", myTeamId);
            return res.status(400).json({ error: 'Invalid Team ID. Please re-login or create a team.' });
        }

        // 2. Double check the slots aren't already booked
        const { data: checkData, error: checkError } = await supabase
            .from('field_availabilities')
            .select('id, status')
            .in('id', availabilityIds);
            
        if (checkError) throw checkError;
        
        const alreadyBooked = checkData.some(slot => slot.status !== 'available');
        if (alreadyBooked) {
            return res.status(400).json({ error: 'One or more of these slots were just booked by someone else!' });
        }

        // 3. Mark them as booked in the field_availabilities table
        const { error: updateError } = await supabase
            .from('field_availabilities')
            .update({ status: 'booked' })
            .in('id', availabilityIds);
            
        if (updateError) {
            console.error("Failed to update slot status:", updateError);
            throw updateError;
        }

        // 4. Create the match records linking the slot to your team
        const matchRecords = availabilityIds.map(id => ({
            field_availability_id: id, 
            team_a_id: myTeamId, 
            team_b_id: opponentTeamId || null
        }));
        
        console.log("Attempting to insert match records:", matchRecords);
        
        const { error: matchError } = await supabase
            .from('confirmed_matches')
            .insert(matchRecords);
            
        if (matchError) {
            console.error("Failed to insert confirmed_matches:", matchError);
            // ROLLBACK: If the match fails, un-book the field!
            await supabase.from('field_availabilities').update({ status: 'available' }).in('id', availabilityIds);
            throw matchError;
        }

        console.log("--- BOOKING SUCCESSFUL ---");
        res.json({ message: 'All selected time slots reserved successfully!' });

    } catch (err) {
        console.error("Booking Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});


// --- 7. GET A TEAM'S CONFIRMED MATCHES (Used in Matches.tsx) ---
app.get('/api/matches', async (req, res) => {
    const { myTeamId } = req.query;
    if (!myTeamId) return res.status(400).json({ error: "Missing myTeamId" });

    try {
        const { data, error } = await supabase
            .from('confirmed_matches')
            .select(`
                id, 
                match_status, /* <-- NEW: Pulling the status */
                field_availabilities(start_time, end_time, fields(name, format, sport)), 
                team_a:team_a_id(team_name, age_group, division), 
                team_b:team_b_id(team_name)
            `)
            .or(`team_a_id.eq.${myTeamId},team_b_id.eq.${myTeamId}`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const now = new Date();
        const upcomingMatches = data.filter(m => {
            const isFuture = new Date(m.field_availabilities.start_time) >= now;
            // NEW: Only show it on the main calendar if it's confirmed or open
            const isValidStatus = m.match_status === 'confirmed' || m.match_status === 'open';
            return isFuture && isValidStatus;
        });

        res.json(upcomingMatches);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// --- 8. GET A TEAM'S OPEN SLOTS (TeamFinder.tsx) ---
app.get('/api/my-open-matches', async (req, res) => {
    const { myTeamId } = req.query;
    console.log("--- FETCHING OPEN MATCHES FOR TEAM:", myTeamId, "---");

    if (!myTeamId || myTeamId === 'null') {
        return res.status(400).json({ error: "Missing myTeamId" });
    }

    try {
        // Query the database exactly as it is saved
        const { data, error } = await supabase
            .from('confirmed_matches')
            .select(`
                id, 
                field_availabilities (
                    start_time, 
                    end_time, 
                    fields (name)
                )
            `)
            .eq('team_a_id', myTeamId)
            .is('team_b_id', null);

        if (error) {
            console.error("Supabase Query Error:", error);
            throw error;
        }

        console.log(`Found ${data?.length || 0} raw matches before filtering.`);

        // Relaxed Filter: Only ensure the joined data exists, don't filter by time yet
        const validMatches = data?.filter(m => m.field_availabilities !== null) || [];
        
        console.log(`Sending ${validMatches.length} valid matches to frontend.`);

        // Sort chronologically
        validMatches.sort((a, b) => 
            new Date(a.field_availabilities.start_time) - new Date(b.field_availabilities.start_time)
        );

        res.json(validMatches);
    } catch (err) {
        console.error("Endpoint Error:", err.message);
        res.status(500).json({ error: err.message });
    }
});



// --- 9. ADD OPPONENT & SEND EMAIL (Used in TeamFinder.tsx) ---
app.post('/api/add-opponent', async (req, res) => {
    const { matchIds, opponentTeamId, myTeamId, inviteNotes } = req.body; 
    if (!matchIds || matchIds.length === 0) return res.status(400).json({ error: 'No matches selected!' });

    try {
        // Update the match to 'pending'
        const { error: updateError } = await supabase
            .from('confirmed_matches')
            .update({ 
                team_b_id: opponentTeamId, 
                match_status: 'pending',
                invite_notes: inviteNotes || null
            })
            .in('id', matchIds);
        
        if (updateError) throw updateError;

        // 2. Fetch team info for the email notification
        const { data: opponentData } = await supabase.from('teams').select('team_name, contact_email').eq('id', opponentTeamId).single();
        const { data: myTeamData } = await supabase.from('teams').select('team_name').eq('id', myTeamId).single();

        // 3. Send the Email
        if (opponentData && opponentData.contact_email) {
            const mailOptions = {
                from: 'ttboom2015@gmail.com', 
                to: opponentData.contact_email, 
                subject: `⚽ Match Challenge: ${myTeamData.team_name} invited you to play!`,
                text: `Hello ${opponentData.team_name} Manager,\n\nYou have been challenged to a match by ${myTeamData.team_name}!\n\nThey have already reserved the field for ${matchIds.length * 30} minutes. Please log in to your FieldFinder dashboard to view the match details, location, and time.\n\nGame on,\nThe FieldFinder Team`,
                html: `
                    <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                        <h2 style="color: #007bff;">⚽ You've been challenged!</h2>
                        <p>Hello <strong>${opponentData.team_name}</strong> Manager,</p>
                        <p>You have been invited to a match by <strong>${myTeamData.team_name}</strong>.</p>
                        <p>They have already secured the field for <strong>${matchIds.length * 30} minutes</strong>.</p>
                        <p>Please log in to your FieldFinder dashboard to view the exact location, date, and time.</p>
                        <br/>
                        <p>Game on,<br/><strong>The FieldFinder Team</strong></p>
                    </div>
                `
            };

            // Assuming `transporter` is defined at the top of your server.js
            if (typeof transporter !== 'undefined') {
                transporter.sendMail(mailOptions, (error, info) => {
                    if (error) console.error("Email failed to send:", error);
                    else console.log("Challenge email sent to:", opponentData.contact_email);
                });
            }
        }

       res.json({ message: 'Invite sent! Awaiting opponent approval.' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 10. GOOGLE CALENDAR SYNC (Used in AdminDashboard.tsx) ---
app.post('/api/sync-calendar', async (req, res) => {
    const { fieldId } = req.body;
    if (!fieldId) return res.status(400).json({ error: "Missing fieldId" });

    try {
        const { data: field } = await supabase.from('fields').select('external_ical_url').eq('id', fieldId).single();
        if (!field || !field.external_ical_url) return res.status(400).json({ error: "No external calendar URL saved." });

        let fetchOptions = {};
        if (process.env.NODE_ENV !== 'production' && !process.env.RENDER) {
            const { HttpsProxyAgent } = require('https-proxy-agent');
            fetchOptions.agent = new HttpsProxyAgent('http://ep.threatpulse.net:80');
        }

        const fetch = require('cross-fetch');
        const ical = require('node-ical'); 
        
        const calResponse = await fetch(field.external_ical_url, fetchOptions);
        if (!calResponse.ok) throw new Error("Failed to download calendar from Google");
        const calText = await calResponse.text();
        const events = await ical.async.parseICS(calText);
        
        const now = new Date().toISOString();
        const { data: existingSlots } = await supabase
            .from('field_availabilities')
            .select('id, start_time, status')
            .eq('field_id', fieldId)
            .gte('start_time', now);

        const dbMap = {};
        existingSlots?.forEach(slot => { dbMap[new Date(slot.start_time).toISOString()] = slot; });

        const toUpdateIds = [];
        const toInsert = [];
        let eventsFound = 0;

        const getGridBlocks = (start, end) => {
            let s = new Date(start); s.setMinutes(s.getMinutes() < 30 ? 0 : 30, 0, 0); 
            let e = new Date(end);
            if (e.getMinutes() !== 0 && e.getMinutes() !== 30 || e.getSeconds() !== 0) e.setMinutes(e.getMinutes() < 30 ? 30 : 60, 0, 0); 
            let blocks = [];
            while (s < e) {
                let blockEnd = new Date(s.getTime() + 30 * 60000);
                blocks.push({ start: new Date(s), end: blockEnd });
                s = blockEnd;
            }
            return blocks;
        };

        for (const key in events) {
            if (events.hasOwnProperty(key)) {
                const ev = events[key];
                if (ev.type === 'VEVENT') {
                    const evEnd = new Date(ev.end);
                    if (evEnd > new Date()) {
                        eventsFound++;
                        const blocks = getGridBlocks(ev.start, ev.end);
                        blocks.forEach(block => {
                            const isoStart = block.start.toISOString();
                            if (dbMap[isoStart]) {
                                if (dbMap[isoStart].status !== 'booked') {
                                    toUpdateIds.push(dbMap[isoStart].id);
                                    dbMap[isoStart].status = 'booked'; 
                                }
                            } else {
                                toInsert.push({ field_id: fieldId, start_time: isoStart, end_time: block.end.toISOString(), status: 'booked', price: 50.00 });
                                dbMap[isoStart] = { status: 'booked' }; 
                            }
                        });
                    }
                }
            }
        }

        if (toUpdateIds.length > 0) await supabase.from('field_availabilities').update({ status: 'booked' }).in('id', toUpdateIds);
        if (toInsert.length > 0) await supabase.from('field_availabilities').insert(toInsert);

        res.json({ message: `Sync complete! Created ${toInsert.length} new booked slots and updated ${toUpdateIds.length} existing slots.` });
    } catch (err) {
        console.error("Sync Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- GET PENDING INVITES FOR A TEAM ---
app.get('/api/pending-invites', async (req, res) => {
    const { teamId } = req.query;
    if (!teamId) return res.status(400).json({ error: "Missing teamId" });

    try {
        const { data, error } = await supabase
            .from('confirmed_matches')
            .select(`
                id, 
                match_status,
                invite_notes,
                field_availabilities (start_time, end_time, fields(name, sport, format)), 
                team_a:team_a_id (team_name, manager_name)
            `)
            .eq('team_b_id', teamId)
            .eq('match_status', 'pending')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data || []);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- 11. RESPOND TO INVITE (ACCEPT/DECLINE) ---
app.post('/api/respond-invite', async (req, res) => {
    const { matchId, responseStatus, responseNotes } = req.body; // status: 'confirmed' or 'declined'
    
    try {
        const { error } = await supabase
            .from('confirmed_matches')
            .update({ 
                match_status: responseStatus,
                response_notes: responseNotes || null
            })
            .eq('id', matchId);

        if (error) throw error;
        
        // (Optional: You can add Nodemailer logic here later to email Team A that their invite was accepted!)
        
        res.json({ message: `Match ${responseStatus} successfully.` });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ==========================================
// START SERVER
// ==========================================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend is running on port ${PORT}`);
});
