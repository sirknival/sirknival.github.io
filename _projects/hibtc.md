---
layout: page
title: Hierarchical Impedance-Based Tracking Control
description: Term paper about manipulation & locomotion course
img: assets/img/hibtc/Exp_3.png
importance: 1
category: work
related_publications: false
---

## Applied Theory
The aim of this term paper is implementing a hierarchical impedance-based tracking controller for the kinematically redundant Franka robot arm. The robot arm has 7 DoF $$(n=7$$), which can be derived with the formula of Grübler. For implementing the controller two assumptions needed to be fulfilled. 

The first assumption is that the total task dimensions $$m_i$$ match the number of DoF in the system. With this information the three hierarchical task spaces were chosen as

1. The endeffector position $$p_e \in \mathbb{R}^3 \implies m_1=3$$
2. The endeffector orientation in euler angles $$\phi_e \in \mathbb{R}^3 \implies m_2=3$$
3. The first joint angle $$q_1 \in \mathbb{R} \implies m_3=1$$

which fulfills the condition $$ \sum_{i=1}^3 m_i = n$$.

Following the notation $$x_i^{aug}=\begin{bmatrix} x_1 &...& x_i \end{bmatrix}^T$$ with hierarchy level $$i$$, we can define the augmented state vector

$$
x_3^{aug}=
\begin{bmatrix}
p_{e,x} &
p_{e,y} &
p_{e,z} &
\phi_{e,x} &
\phi_{e,y} &
\phi_{e,z} &
q_1
\end{bmatrix}^T .
$$

The second assumption is considering  a workspace which is free of kinematically and representational singularities. Furthermore, it is assumed that the initial state 

$$
\left. x_3^{aug}  \right|_{t = 0} = x_{init, k}
$$

, $$k$$ indexing the vector entries, is already located on the desired trajectory. All this is fulfilled by the desired trajectory  

$$
\label{eq:des_traj}
   x_{3, des}^{aug}  =
\begin{bmatrix}
x_{init, 1}+ 0.05\, \cos(\omega t) \\
x_{init, 2} + 0.05\, \sin(\omega t) \\
x_{init, 3-6} \\
x_{init, 7} + 0.4\, \sin(\omega t)\\
\end{bmatrix} 
$$

and its analytical first and second derivatives.

Given the Jacobian of the end effector, we can define the Jacobians $$J_i(q)$$ for the first two tasks with 

$$
\begin{bmatrix}
    \dot{p}_e & \omega_e
\end{bmatrix}^T = \begin{bmatrix} J_1 (q) & J_2(q) \end{bmatrix}^T \, \dot{q} .
$$

The Jacobian for the third task $$J_3$$ is given with 

$$
\dot{q}_0 = J_3(q) \, \dot{q} = \begin{bmatrix} 1 & 0_{1 \times 6} \end{bmatrix} \, \dot{q}.
$$

This results in the augmented Jacobian with 

$$
    {J}_{3}^{aug}(q) = \begin{bmatrix} J_{1}(q) & J_{2}(q) & J_{3}(q) \end{bmatrix}^T .
$$

With the transformation from task space velocities  $$\dot{x}_3^{aug}$$ into hierarchically decoupled velocities $$v$$ using null space projections $$\bar{J}_i(q)$$ of $${J}_{3}^{aug}(q)$$, the equation of motion in hierarchically decoupled coordinates can be derived with a new inertia matrix $$\Lambda(q)$$, as well as new Coriolis and centrifugal effects $$\mu(q, \dot{q})$$.

The control law was then derived by transforming this back into the original task space. As mentioned in the paper, the control law is then as follows:

$$
    \tau = g + \tau_{\mu} + \sum_{i=1}^r \bar{J}_i(q)\,F_{i,\mathrm{ctrl}}
$$

with gravity compensation $$g$$, a term for task executions for each task level based on the control force $$F_{i, \mathrm{ctrl}}$$ as well as $$\tau_\mu$$ which represents the Coriolis and centrifugal forces of the coupled tasks due to the remaining coupling described above. 

$$
    \tau_{\mu} 
    = \sum_{i=1}^r \Bigl(
        \overline{J}_i^T \Bigl(
            \sum_{j=1}^{i-1} \mu_{i,j}\,v_j 
            + \sum_{j=i+1}^r \mu_{i,j}\,v_j
        \Bigr)
      \Bigr)
$$

$$
\label{eq:F_i_ctrl}
    \begin{split}
        F_{i, \mathrm{ctrl}} &= \Lambda_i \ddot{x}_{i, \mathrm{des}}+\mu_{i, i} \dot{x}_{i, \mathrm{des}}-D_i \dot{\tilde{x}}_i-K_i \tilde{x}_i \\
& +\gamma_i(q, \dot{q})\binom{\dot{x}_{i-1, \mathrm{des}}^{\text {aug }}}{\ddot{x}_{i-1, \text { des }}^{\text {aug }}}-F_{i, \text { ctrl }}^{\text {ext }}
    \end{split}.
$$

The orientation error $$\tilde{x}_{4-6}$$ was implemented with quaternions, avoiding representation singularities. Furthermore, $$F_{i, \text { ctrl }}^{\text {ext }}$$ depends on the case in question. Case 1 describes no feedback of external forces, while case 2 uses a feedback signal compensating for them with  

$$
\label{eq:F_ext}
F_{i, \text { ctrl }}^{\text {ext }} = \sum_{j = i + 1}^{r} \mathbf{E}_{i,j}(\mathbf{q}) \, \mathbf{F}_{\dot{x}_j}^{\text{ext}}
$$

by transforming into $$v$$-space with $$E$$. Note that this has only inertially decoupled behavior, not dynamically. For non-constant forces, lower levels can still be influenced.

## Experiments
For all following experiments, we chose constant parameters 

$$
K=diag([500, 1500, 1500, 100, 40, 40, 100)
$$ 

and 

$$
D=diag(80, 80, 80, 20, 13, 13, 10) .
$$ 

In the experiments, we distinguish between 3 test cases.

 1. Comparison of two target trajectories, where one, as described in equation \ref{eq:des_traj}, has no conflicting tasks and the other does. The conflicting trajectory is realized by changing the last task to $$x_{7} = x_{init, 7} + 2\pi\, \sin(\omega t)$$, which results in a oscillation of the first joint with two full rotations.
 2. Investigation of the influence of the $$\gamma_i(q, \dot{q})$$-term by running one simulation including the  $$\gamma_i$$-term and one without it.
 3. External forces were applied at different task levels to examine their effects on the controller in both cases, as described along with equation \ref{eq:F_ext}. In each interval the corresponding force vector part $$\mathbf{F}_{\dot{x}_j}^{\text{ext}} = \begin{bmatrix}300& 300 & 0 &60 & 0 & 0 & 100\end{bmatrix}^T$$ was applied on a different task level.


<div class="row">
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/hibtc/Exp_1.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/hibtc/Exp_2.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
    <div class="col-sm mt-3 mt-md-0">
        {% include figure.liquid loading="eager" path="assets/img/hibtc/Exp_3_f.png" title="example image" class="img-fluid rounded z-depth-1" %}
    </div>
</div>
<div class="caption">
   Experiment plot 1 (left): Comparison of conflicting (dashed) and non-conflicting (solid) desired trajectories, Experiment plot 2 (middle): Comparison of w. and w/o compensating for top-down disturbances through the $$\gamma_i(q, \dot{q})$$-term, Experiment plot 3 (right): Comparison of energy levels case 1: w/o feedback of forces/torques, case 2: w. feedback of forces/torques
</div>


The tracking error for experiment \#1 is shown in figure \ref{fig:traj-comp}. It can be seen that in the case of a non-conflicting desired trajectory, the tracking error converges to zero for all task levels. While choosing a conflicting task, the tracking is non-zero in all tasks. This means a lower task that is in structural conflict with higher tasks also affects them as higher tasks, but the controller is still able to partially execute the tasks. The paper also makes this point, highlighting the importance of selecting a suitable trajectory that is both singularity-free and non-conflicting.
The effect of not considering the $$\gamma_i(q, \dot{q})$$-term in equation \ref{eq:F_i_ctrl} is treated in Experiment \#2 and shown in figure \ref{fig:effect_gamma}. 

To briefly recap, the purpose of the $$\gamma_i(q, \dot{q})$$-term is to compensate for top-down disturbances affecting lower task levels. This can nicely be seen in this experiment. While in both simulations, with and without the $$\gamma_i(q, \dot{q})$$-term, the absolute task error stays the same for the first task hierarchy level. The error then increases drastically due to top-down disturbances the further it propagates downwards in the levels, unless they are compensated for. On level two, the maximum error is just above $$0.005$$, but for level three it is already approximately $$0.7$$. Note that the error signal is periodic since we have a periodic desired trajectory.

Experiment \#3 evaluates the potential energy on each level, which is shown in figure \ref{fig:energy_ext_forces}, There, the difference between case one and two gets clear. In case one without feedback of external forces, there is a coupling between each task. For example, applying a force on the second level in the time interval $$[0.2 ,  0.4]$$ results in a high peak on the first level, too. While there is no effect on higher tasks in case 2. It can also be seen that for constant forces there is even no effect on lower tasks. The two little peaks on the second level between $$[0.2 ,  0.6]$$ can be explained by the jumps when applying the force. This also highlights the partially (inertial) decoupling between tasks for non-constant external forces and its effects on only lower task levels. Furthermore, applying an external force results, depending on the chosen stiffness $$K$$, in a new equilibrium and with that in a permanent control deviation as long as the force is applied.