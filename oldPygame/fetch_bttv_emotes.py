import os
import sys
import requests

BTTV_USER_API = "https://api.betterttv.net/3/cached/users/twitch/{user_id}"
BTTV_EMOTE_CDN = "https://cdn.betterttv.net/emote/{emote_id}/3x"

TWITCH_USER_API = "https://api.ivr.fi/v2/twitch/user?login={username}"

def get_twitch_user_id(username):
    print(f"Fetching Twitch user ID for '{username}'...")
    url = TWITCH_USER_API.format(username=username)
    resp = requests.get(url)
    if resp.status_code != 200:
        print("Error: Could not fetch Twitch user info.")
        sys.exit(1)
    data = resp.json()
    if isinstance(data, list) and data:
        return data[0]['id']
    elif isinstance(data, dict) and 'id' in data:
        return data['id']
    else:
        print("Error: No user ID found in response.")
        sys.exit(1)

def fetch_bttv_emotes(user_id):
    print(f"Fetching BTTV emotes for user ID {user_id}...")
    url = BTTV_USER_API.format(user_id=user_id)
    resp = requests.get(url)
    if resp.status_code != 200:
        print("Error: Could not fetch BTTV emotes.")
        sys.exit(1)
    data = resp.json()
    emotes = data.get("channelEmotes", []) + data.get("sharedEmotes", [])
    return emotes

def download_emote(emote, folder):
    emote_id = emote['id']
    emote_code = emote['code']
    emote_url = BTTV_EMOTE_CDN.format(emote_id=emote_id)
    print(f"Downloading {emote_code} from {emote_url}...")
    resp = requests.get(emote_url)
    if resp.status_code == 200:
        filename = os.path.join(folder, f"{emote_code}.png")
        with open(filename, 'wb') as f:
            f.write(resp.content)
        print(f"Saved to {filename}")
    else:
        print(f"Failed to download {emote_code}")

def main():
    if len(sys.argv) < 2:
        print("Usage: python fetch_bttv_emotes.py <twitch_username>")
        sys.exit(1)

    username = sys.argv[1].lower()
    emote_folder = "emotes"

    if not os.path.exists(emote_folder):
        os.makedirs(emote_folder)

    user_id = get_twitch_user_id(username)
    emotes = fetch_bttv_emotes(user_id)

    print(f"Found {len(emotes)} emotes.")
    for emote in emotes:
        download_emote(emote, emote_folder)

    print("✅ All done!")

if __name__ == "__main__":
    main()
