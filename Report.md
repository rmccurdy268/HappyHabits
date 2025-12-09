# Happy Habits Report

#### Summary of the project (one to three sentences)

_HappyHabits is an app that will help you track your daily habits and keep logs of how well you are keeping them. The app will use AI to analyze the user's effective habit patterns (when are they the most productive / likely to complete a goal) and provide insight on the progress being made. Notifications help to motivate and keep you on track._

#### Discuss why this project is interesting to you!

_I have been listening to self help books and was inspired to create this sort of app so that I can become more consistent and develop good, daily habits. I feel like I have so many things that I wish I was doing, so I wanted to create an app that could help me keep track of my progress and work towards goals._

#### Demonstrate your system, prototype, proof of concept, or a piece of your system in action. If you have no working code, be sure to show a design of your system.

<video width="50%" height="20%" controls>
  <source src="assets/demo.mov" type="video/mp4">
</video>

#### Key learnings from the project (please try to come up with at least 3)

_Build in deliverables - I took on this project thinking very large scale, about deploying an ECS cluster and building a CI pipeline that would be connected to 5+ amazon services. Initially I felt like I wanted to get the pipeline and hosting configuration in place before I started building the app. When I ran into issues with the CI pipeline and ECS in particular, I was frustrated because I put so much work into it and felt like my app wasn't developing. I switched my strategy to create deliverables, work on a small scale until I had a functional app and was ready to expand._

_Start yesterday - While I felt like I had a lot of time, I felt like I should work on this project sparingly and frontload the rest of my work for the semester. By Thanksgiving break I had nothing else due until the day I was presenting. While this seems like an ideal situation, I was then thrown into building furniture for my mother and law / watching my daughter / taking care of my father in law every day until the saturday before my presentation. I wish I had started earlier!_

_Plan iteratively - I felt like I spent a lot of time planning and that definitely helped, but I planned too much. I found that as the app developed I knew better and better what I wanted, and so I ended up going back on some of the plans I had made in favor of new design decisions._

#### Does your project integrate with AI?

_While I had plans to integrate with AI, I have not implemented these features at this point. I plan to use AI to give feedback to the user about how/when they are the most productive, and to implement a system where AI can understand what the habit is that they are trying to accomplish and give them pointers about strategies they can employ to accomplish their goal._

#### How did you use AI to assist in building your project?

_I used AI constantly while building this project. I spent a lot of time planning with ChatGPT. It helped me to plan out many different facets of the app including database design tradeoffs, API setup, and frontend design decisions. I used cursor to help me build the frontend (I had no experience with react native), and I kept a close eye on it to make sure that I was following the decisions that it made. I am working now on making sure that the app is built well, with few full refreshes and only necessary logic._

#### A diagram modeling the different parts of your system including the scaling characteristics of your system (find how your technologies scale by just testing it out or looking up the technology's documentation).

![HappyHabits ERD](assets/happyHabitsERD.png)

![HappyHabits Tech Stack](assets/happyHabitsTechStackV2.png)

_Hopefully moving to ECS with Fargate soon to start scaling_

#### Explanation if applicable of failover strategy , performance characteristics, authentication, concurrency, etc.

_Since I implemented the current backend with a docker container, amazon ECR and EC2, it should be fairly simple (hopefully) to transition the backend servers from EC2 to ECS where they will scale automatically with fargate._

_The database is using supabase, which can be scaled automatically depending on the plan that I'm subscribed to. I will wait to upgrade this subscription until necessary, and if it gets large enough I will migrate to MySQL to better handle the scaling._

_Supabase auth is currently set up with refresh and session tokens, user accounts._

#### Next moves

_Implement notifications (need to change expo configuration)_

_Add AI features_

_Upgrade to ECS_

_Add success! In-app notifications for successful completion of all daily goals_
