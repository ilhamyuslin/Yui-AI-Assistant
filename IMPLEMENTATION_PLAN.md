# Yui Financial Dashboard - Implementation Plan

## Current Status: Building Goals Feature
**Objective:** Implement a premium "Wishlist" and "Financial Goals" tracker with smart progress visualization.

### 1. Feature Specifications (Goals)
*   **Wishlist Card:** Display individual goals as high-fidelity glassmorphism cards.
*   **Target Calculation:**
    - Monthly Savings Suggestion: `(Target Amount - Current Amount) / Months Left`.
    - Savings Velocity: Calculating if user is ahead or behind schedule.
*   **Visuals:**
    - **Glowing Rings:** Multi-layered circular progress indicators.
    - **Health Status:** Color-coded glow (Green = On Track, Amber = Behind, Red = Critical).
*   **Manual Tracking:** Users update their progress manually via a premium slider/input modal.

### 2. Technical Strategy
*   **Database Schema:**
    ```sql
    create table public.goals (
      id uuid default gen_random_uuid() primary key,
      user_id uuid references auth.users not null,
      title text not null,
      target_amount decimal not null,
      current_amount decimal default 0,
      target_date date not null,
      category text, -- e.g., 'Vehicle', 'House', 'Gadget', 'Travel'
      priority text default 'Medium', -- 'Low', 'Medium', 'High'
      status text default 'Active', -- 'Active', 'Completed', 'Paused'
      created_at timestamp with time zone default timezone('utc'::text, now()) not null
    );
    ```
*   **Frontend Components:**
    - `GoalsSection.jsx`: Container for goals list.
    - `GoalCard.jsx`: Individual goal display with the "Glowing Ring" visualization.
    - `GoalModal.jsx`: For adding/editing goals and updating progress.

### 3. Design Guidelines
*   Use **Lucide React** for icons.
*   Follow the **Glassmorphism** aesthetic (white/10 background, 40px blur).
*   Implement **Micro-animations** for progress updates.
*   Priority-based gradients for background glow.

---

## Completed Tasks
- [x] Investment Section Revamp (Horizontal Slider).
- [x] Account Portfolio Shortcuts (Edit/Delete).
- [x] Fixed Account Creation Bug.
- [x] Updated Page Title.
- [x] "Add Transaction" button visibility logic.
- [x] Forgot Password & Password Recovery Flow.
